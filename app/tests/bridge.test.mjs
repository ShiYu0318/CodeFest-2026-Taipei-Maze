import test from "node:test";
import assert from "node:assert/strict";
import { createQrBridge } from "../src/navigation/bridge.mjs";
function native() {
  const listeners = new Set(),
    messages = [];
  return {
    messages,
    postMessage(m) {
      messages.push(JSON.parse(m));
    },
    addEventListener(name, f) {
      listeners.add(f);
    },
    removeEventListener(name, f) {
      listeners.delete(f);
    },
    reply(data) {
      for (const f of listeners) f({ data });
    },
    get listeners() {
      return listeners.size;
    },
  };
}
test("missing native bridge reports unavailable rather than fake success", async () => {
  const b = createQrBridge(null);
  assert.equal(b.available, false);
  assert.equal((await b.scan()).type, "Unavailable");
  b.dispose();
});
test("bridge serializes calls and only accepts matching string/null replies", async () => {
  const n = native(),
    b = createQrBridge(n, 100);
  const p = b.scan();
  assert.deepEqual(n.messages, [{ name: "qr_code_scan", data: null }]);
  assert.equal((await b.scan()).type, "Busy");
  n.reply("not json");
  n.reply(JSON.stringify({ name: "deviceinfo", data: "wrong" }));
  n.reply(JSON.stringify({ name: "qr_code_scan", data: "payload" }));
  assert.deepEqual(await p, { type: "success", payload: "payload" });
  const cancel = b.scan();
  n.reply(JSON.stringify({ name: "qr_code_scan", data: null }));
  assert.equal((await cancel).type, "Cancelled");
  const malformed = b.scan();
  n.reply(JSON.stringify({ name: "qr_code_scan", data: 123 }));
  assert.equal((await malformed).type, "InvalidReply");
  b.dispose();
  assert.equal(n.listeners, 0);
});
test("timeout prevents unsafe retry until late reply is drained", async () => {
  const n = native(),
    b = createQrBridge(n, 5);
  assert.equal((await b.scan()).type, "Timeout");
  assert.equal((await b.scan()).type, "WaitingForDrain");
  n.reply(JSON.stringify({ name: "qr_code_scan", data: "late" }));
  const fresh = b.scan();
  n.reply(JSON.stringify({ name: "qr_code_scan", data: "new" }));
  assert.equal((await fresh).payload, "new");
  b.dispose();
});
test("disposing resolves in-flight request and never leaves an active listener", async () => {
  const n = native(),
    b = createQrBridge(n, 100);
  const p = b.scan();
  b.dispose();
  assert.equal((await p).type, "Cancelled");
  assert.equal(n.listeners, 0);
  assert.equal((await b.scan()).type, "Unavailable");
});
