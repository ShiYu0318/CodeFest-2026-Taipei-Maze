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

test("adapter remount on same native channel drains old reply before a fresh request", async () => {
  const n = native(),
    first = createQrBridge(n, 100),
    old = first.scan();
  first.dispose();
  assert.equal((await old).type, "Cancelled");
  const second = createQrBridge(n, 100);
  assert.equal((await second.scan()).type, "WaitingForDrain");
  n.reply(JSON.stringify({ name: "qr_code_scan", data: "old-payload" }));
  const fresh = second.scan();
  n.reply(JSON.stringify({ name: "qr_code_scan", data: "new-payload" }));
  assert.equal((await fresh).payload, "new-payload");
  second.dispose();
  assert.equal(n.listeners, 0);
});

test("late host injection enables the existing adapter and subscribes before sending", async () => {
  let host;
  const b = createQrBridge(() => host);
  assert.equal(b.available, false);
  assert.equal((await b.scan()).type, "Unavailable");
  host = native();
  host.postMessage = (message) => {
    host.messages.push(JSON.parse(message));
    host.reply(JSON.stringify({ name: "qr_code_scan", data: "anchor" }));
  };
  assert.deepEqual(await b.scan(), { type: "success", payload: "anchor" });
  assert.deepEqual(host.messages, [{ name: "qr_code_scan", data: null }]);
  assert.equal(host.listeners, 1);
  b.dispose();
  assert.equal(host.listeners, 0);
});

test("a connected request stays on its native channel until disposed", async () => {
  const first = native(),
    second = native();
  let host = first;
  const b = createQrBridge(() => host);
  const pending = b.scan();
  host = second;
  assert.equal(b.available, true);
  assert.equal((await b.scan()).type, "Busy");
  assert.equal(second.listeners, 0);
  first.reply(JSON.stringify({ name: "qr_code_scan", data: "first" }));
  assert.equal((await pending).payload, "first");
  b.dispose();
  assert.equal(first.listeners, 0);
  assert.equal(b.available, false);
  assert.equal(second.listeners, 0);
});

test("disposed adapters never connect to a host injected later", async () => {
  let host;
  const b = createQrBridge(() => host);
  b.dispose();
  host = native();
  assert.equal(b.available, false);
  assert.equal((await b.scan()).type, "Unavailable");
  assert.equal(host.listeners, 0);
});
