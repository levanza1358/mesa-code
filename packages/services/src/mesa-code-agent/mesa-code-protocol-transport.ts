import type { Event, IDisposable } from "@mesa-code/rpc";
import type { MesaCodeProtocolMessage } from "@mesa-code/shared";

export type MesaCodeProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface MesaCodeProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface MesaCodeProtocolTransport extends IDisposable {
  readonly kind: MesaCodeProtocolTransportKind;
  readonly onMessage: Event<MesaCodeProtocolMessage>;
  readonly onClose: Event<MesaCodeProtocolTransportClosedEvent>;
  send(message: MesaCodeProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
