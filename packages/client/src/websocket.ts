import {
  Emitter,
  VSBuffer,
  SocketProtocol,
  ChannelClient,
  type IMessagePassingProtocol,
  type ISocket,
} from "@mesa-code/rpc";
import type { IServiceAccessor } from "@mesa-code/services";
import { RemoteServiceAccess } from "./remoteServiceAccess.js";

export interface WebSocketConnectionCloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

interface WebSocketConnectionOptions {
  onClose?: (event: WebSocketConnectionCloseEvent) => void;
  /**
   * Fires once when the ready connection's socket ends (close or error). Unlike
   * `onClose` — which also fires for a socket that never became ready — this is the
   * "an established transport died" signal the caller uses to reconnect. See
   * docs/specs/web-remote-reconnect.md.
   */
  onEnd?: () => void;
  onOpenSocket?: (socket: WebSocket) => void;
}

function wrapBrowserWebSocket(ws: WebSocket): ISocket {
  const onData = new Emitter<VSBuffer>();
  const onClose = new Emitter<void>();
  const onEnd = new Emitter<void>();

  ws.binaryType = "arraybuffer";
  ws.addEventListener("message", (e) => {
    onData.fire(VSBuffer.wrap(new Uint8Array(e.data as ArrayBuffer)));
  });
  ws.addEventListener("close", () => {
    onClose.fire();
    onEnd.fire();
  });
  ws.addEventListener("error", () => {
    onClose.fire();
    onEnd.fire();
  });

  return {
    onData: onData.event,
    onClose: onClose.event,
    onEnd: onEnd.event,
    write(buffer: VSBuffer) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buffer.buffer as Uint8Array<ArrayBuffer>);
      }
    },
    end() {
      ws.close();
    },
    drain() {
      return Promise.resolve();
    },
    dispose() {
      ws.close();
    },
  };
}

export function connectViaWebSocket(
  wsUrl: string,
  options?: WebSocketConnectionOptions,
): Promise<IServiceAccessor> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let settled = false;

    ws.addEventListener("error", () => {
      if (!settled) {
        reject(new Error(`WebSocket connection failed: ${wsUrl}`));
      }
    });
    ws.addEventListener("close", (event) => {
      options?.onClose?.({
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      if (!settled) {
        reject(
          new Error(
            event.reason
              ? `WebSocket closed before ready: ${event.reason}`
              : `WebSocket closed before ready (${event.code})`,
          ),
        );
      }
    });

    ws.addEventListener("open", () => {
      settled = true;
      options?.onOpenSocket?.(ws);
      resolve(createWebSocketServiceAccess(wrapBrowserWebSocket(ws), options?.onEnd));
    });
  });
}

/**
 * Builds the service accessor for an established socket and wires the fail-closed
 * contract: an established transport that closes (phone locked / backgrounded / BFCache
 * freeze) rejects every in-flight and queued RPC instead of leaving them pending forever,
 * then reports the end to `onEnd` so the caller can reconnect. Extracted so the contract
 * is unit-testable with a fake socket. See docs/specs/web-remote-reconnect.md.
 */
export function createWebSocketServiceAccess(
  socket: ISocket,
  onEnd?: () => void,
): IServiceAccessor {
  const client = new ChannelClient(new SocketProtocol(socket));
  let ended = false;
  const handleEnd = () => {
    if (ended) {
      return;
    }
    ended = true;
    client.dispose(new Error("WebSocket transport ended"));
    onEnd?.();
  };
  socket.onClose(handleEnd);
  socket.onEnd(handleEnd);
  return new RemoteServiceAccess(client);
}

export function connectViaProtocol(protocol: IMessagePassingProtocol): IServiceAccessor {
  const client = new ChannelClient(protocol);
  return new RemoteServiceAccess(client);
}
