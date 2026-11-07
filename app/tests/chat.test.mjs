import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatBridge,
  buildChatPrompt,
  shouldSendOnEnter,
  isUsableChatReply,
} from "../src/chat/bridge.mjs";
function host() {
  const sent = [],
    listeners = new Set();
  return {
    sent,
    postMessage: (m) => sent.push(JSON.parse(m)),
    addEventListener: (_, f) => listeners.add(f),
    removeEventListener: (_, f) => listeners.delete(f),
    reply: (data) =>
      [...listeners].forEach((f) =>
        f({ data: JSON.stringify({ name: "codefest_ai", data }) })
      ),
  };
}
let serial = 0;
const idFactory = () => (++serial).toString(16).padStart(32, "0");
test("chat status never asks for mic; unsupported host is explicit", async () => {
  const h = host(),
    b = createChatBridge(h, { idFactory });
  const p = b.request("status");
  assert.equal(h.sent[0].data.action, "status");
  h.reply({
    requestId: h.sent[0].data.requestId,
    status: "success",
    modelReady: false,
  });
  assert.equal((await p).modelReady, false);
  b.dispose();
  assert.equal(
    (await createChatBridge(null).request("status")).code,
    "unavailable"
  );
});
test("only matching replies complete requests; timeout cancels and late reply is ignored", async () => {
  const h = host(),
    b = createChatBridge(h, { idFactory, timeoutMs: 10 });
  const p = b.request("generate", { prompt: "hello" }),
    id = h.sent[0].data.requestId;
  h.reply({ requestId: "0".repeat(32), status: "success", text: "wrong" });
  assert.equal((await p).code, "timeout");
  assert.equal(h.sent.at(-1).data.targetRequestId, id);
  h.reply({ requestId: id, status: "success", text: "late" });
  b.dispose();
});
test("dispose cancels outstanding work, bounds output and rejects oversized payload", async () => {
  const h = host(),
    b = createChatBridge(h, { idFactory });
  assert.equal(
    (await b.request("generate", { prompt: "x".repeat(6001) })).code,
    "invalid_input"
  );
  const p = b.request("generate", { prompt: "hi" });
  b.dispose();
  assert.equal((await p).code, "cancelled");
  assert.equal(h.sent.at(-1).data.action, "cancel");
  assert.equal((await b.request("status")).code, "unavailable");
});
test("prompt uses bounded plain dialogue, rejects empty and never adds navigation tools", () => {
  assert.equal(buildChatPrompt([], " "), null);
  assert.equal(buildChatPrompt([], "x".repeat(501)), null);
  const p = buildChatPrompt(
    Array.from({ length: 30 }, () => ({ role: "user", text: "x".repeat(500) })),
    "廁所在哪"
  );
  assert.ok(p.length <= 4000);
  assert.match(p, /廁所在哪/);
  assert.match(p, /Do not invent/);
});

test("prompt byte budget leaves space for bounded generation with multilingual input", () => {
  const prompt = buildChatPrompt(
    Array.from({ length: 20 }, () => ({
      role: "user",
      text: "你好".repeat(250),
    })),
    "😀".repeat(500)
  );
  assert.ok(new TextEncoder().encode(prompt).length <= 3500);
  assert.match(prompt, /😀/);
});

test("IME Enter accepts composition without sending; Shift Enter stays a newline", () => {
  assert.equal(shouldSendOnEnter({ key: "Enter", isComposing: true }), false);
  assert.equal(shouldSendOnEnter({ key: "Enter", keyCode: 229 }), false);
  assert.equal(shouldSendOnEnter({ key: "Enter", shiftKey: true }), false);
  assert.equal(shouldSendOnEnter({ key: "Enter" }), true);
});

test("repeated model output is rejected instead of displayed as a useful answer", () => {
  assert.equal(isUsableChatReply("可以先選擇目的地，再掃描定位碼。"), true);
  assert.equal(isUsableChatReply(""), false);
  assert.equal(isUsableChatReply("地、".repeat(40)), false);
  assert.equal(isUsableChatReply("abcdef".repeat(10)), false);
});

test("prompt names the reply language and carries app facts within the byte budget", () => {
  const prompt = buildChatPrompt([], "Tôi nên làm gì?", {
    languageName: "Tiếng Việt",
  });
  assert.match(prompt, /Reply only in Tiếng Việt/);
  assert.match(prompt, /Show to staff/);
  assert.match(prompt, /exits are not mapped/i);
  const long = buildChatPrompt(
    Array.from({ length: 20 }, () => ({
      role: "user",
      text: "你好".repeat(250),
    })),
    "😀".repeat(500),
    { languageName: "ไทย" }
  );
  assert.ok(new TextEncoder().encode(long).length <= 3500);
  assert.match(long, /ไทย/);
});
