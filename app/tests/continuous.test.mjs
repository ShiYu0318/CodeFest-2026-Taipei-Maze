import test from "node:test";
import assert from "node:assert/strict";
import { createContinuousScanner } from "../src/navigation/continuous.mjs";
function native() {
  const listeners = new Set(),
    messages = [];
  return {
    messages,
    postMessage(m) {
      messages.push(JSON.parse(m));
    },
    addEventListener(n, f) {
      listeners.add(f);
    },
    removeEventListener(n, f) {
      listeners.delete(f);
    },
    reply(data) {
      for (const f of listeners)
        f({ data: JSON.stringify({ name: "qr_scan_session", data }) });
    },
    get count() {
      return listeners.size;
    },
  };
}
const ids = () => {
  let n = 0;
  return () => String(++n).padStart(32, "0");
};
test("capability probe never opens camera and unsupported hosts remain unavailable", async () => {
  const n = native(),
    s = createContinuousScanner(n, { idFactory: ids(), timeoutMs: 5 });
  assert.equal((await s.probe()).type, "Unavailable");
  assert.equal(n.messages[0].data.action, "capabilities");
  assert.equal(s.start({}).type, "Unavailable");
  s.dispose();
  assert.equal(n.count, 0);
});
test("one native session streams multiple scans, rejects stale IDs/sequence and updates instruction without restart", async () => {
  const n = native(),
    seen = [],
    actions = [],
    s = createContinuousScanner(n, {
      idFactory: ids(),
      onPayload: (p) => seen.push(p),
      onAction: (a) => actions.push(a),
    });
  const probe = s.probe();
  const probeId = n.messages.at(-1).data.sessionId;
  n.reply({
    sessionId: probeId,
    event: "capabilities",
    continuous: true,
    protocol: 1,
  });
  assert.equal((await probe).type, "success");
  assert.equal(
    s.start({ title: "廁所", instruction: "請掃定位碼" }).type,
    "success"
  );
  const id = n.messages.at(-1).data.sessionId;
  n.reply({ sessionId: "old", event: "detected", seq: 1, payload: "wrong" });
  n.reply({ sessionId: id, event: "detected", seq: 1, payload: "a" });
  n.reply({ sessionId: id, event: "detected", seq: 1, payload: "duplicate" });
  n.reply({ sessionId: id, event: "detected", seq: 2, payload: "b" });
  assert.deepEqual(seen, ["a", "b"]);
  s.update({ instruction: "新指引", canAdvance: true });
  assert.equal(n.messages.at(-1).data.action, "update");
  assert.equal(n.messages.filter((m) => m.data.action === "start").length, 1);
  n.reply({
    sessionId: id,
    event: "action",
    seq: 3,
    action: "next",
    guidanceToken: "1:ready:0",
  });
  assert.deepEqual(actions, [{ action: "next", guidanceToken: "1:ready:0" }]);
  s.stop();
  n.reply({ sessionId: id, event: "detected", seq: 4, payload: "late" });
  assert.deepEqual(seen, ["a", "b"]);
  s.dispose();
  assert.equal(n.count, 0);
});

test("capability protocol mismatch never enables the native scanner", async () => {
  const n = native(),
    s = createContinuousScanner(n, { idFactory: ids() });
  const p = s.probe();
  const id = n.messages.at(-1).data.sessionId;
  n.reply({
    sessionId: id,
    event: "capabilities",
    continuous: true,
    protocol: 99,
  });
  assert.equal((await p).type, "Unavailable");
  s.dispose();
});
