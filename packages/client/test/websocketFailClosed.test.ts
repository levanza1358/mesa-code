// Fail-closed transport contract for the web/LAN client. When the phone locks its screen
// or the tab is backgrounded, the OS closes the WebSocket; before this change every RPC
// hung forever because nothing observed the close. This test pins the contract: an
// established socket that ends rejects in-flight calls and reports the end once.
// See docs/specs/web-remote-reconnect.md.
import assert from "node:assert/strict";
import test from "node:test";

import { Emitter, VSBuffer, type ISocket } from "@mesa-code/rpc";
import { createWebSocketServiceAccess } from "../src/websocket.js";

function createFakeSocket() {
  const onData = new Emitter<VSBuffer>();
  const onClose = new Emitter<void>();
  const onEnd = new Emitter<void>();
  const written: VSBuffer[] = [];
  const socket: ISocket = {
    onData: onData.event,
    onClose: onClose.event,
    onEnd: onEnd.event,
    write(buffer) {
      written.push(buffer);
    },
    end() {},
    drain() {
      return Promise.resolve();
    },
    dispose() {},
  };
  return {
    socket,
    written,
    end: () => {
      onClose.fire();
      onEnd.fire();
    },
  };
}

test("an established socket that ends rejects in-flight RPCs instead of hanging", async () => {
  const fake = createFakeSocket();
  const services = createWebSocketServiceAccess(fake.socket);

  // A call sent over a live socket is accepted and parked until a reply arrives.
  const pending = services.fileService.stat({ path: "/x" });
  let settled: "pending" | "rejected" | "resolved" = "pending";
  void pending.then(
    () => {
      settled = "resolved";
    },
    () => {
      settled = "rejected";
    },
  );
  await Promise.resolve();
  assert.equal(settled, "pending");

  // The transport dies (screen lock / background / BFCache freeze).
  fake.end();
  await assert.rejects(pending);
  assert.equal(settled, "rejected");

  // Subsequent calls fail immediately rather than hanging on the dead socket.
  await assert.rejects(services.fileService.stat({ path: "/y" }));
});

test("the end callback fires once even when close and error both fire", () => {
  const fake = createFakeSocket();
  let ends = 0;
  createWebSocketServiceAccess(fake.socket, () => {
    ends += 1;
  });

  // wrapBrowserWebSocket fires onClose and onEnd together on both close and error.
  fake.end();
  fake.end();
  assert.equal(ends, 1);
});
