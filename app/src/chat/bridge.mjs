// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
const id = () =>
  [...globalThis.crypto.getRandomValues(new Uint8Array(16))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
const failure = (code) => ({ status: "error", code });
export function createChatBridge(
  native,
  { idFactory = id, timeoutMs = 60000 } = {}
) {
  const pending = new Map();
  let disposed = false;
  const supported =
    native &&
    ["postMessage", "addEventListener", "removeEventListener"].every(
      (k) => typeof native[k] === "function"
    );
  const send = (data) =>
    native.postMessage(JSON.stringify({ name: "codefest_ai", data }));
  function receive(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message?.name !== "codefest_ai") return;
    const data = message.data,
      entry = pending.get(data?.requestId);
    if (!entry || !["success", "error"].includes(data.status)) return;
    clearTimeout(entry.timer);
    pending.delete(data.requestId);
    entry.resolve(
      typeof data.text === "string" && data.text.length > 12000
        ? failure("invalid_reply")
        : data
    );
  }
  if (supported) native.addEventListener("message", receive);
  const api = {
    request(action, values = {}) {
      if (!supported || disposed)
        return Promise.resolve(failure("unavailable"));
      if (
        ![
          "status",
          "setup",
          "generate",
          "voice",
          "stopVoice",
          "unload",
        ].includes(action) ||
        (action === "generate" &&
          (typeof values.prompt !== "string" ||
            !values.prompt.trim() ||
            values.prompt.length > 6000))
      )
        return Promise.resolve(failure("invalid_input"));
      let requestId;
      try {
        requestId = idFactory();
      } catch {
        return Promise.resolve(failure("unavailable"));
      }
      if (!/^[a-f0-9]{32}$/.test(requestId) || pending.has(requestId))
        return Promise.resolve(failure("unavailable"));
      return new Promise((resolve) => {
        const timer = setTimeout(
          () => api.cancel(requestId, "timeout"),
          action === "status" ? 3000 : action === "setup" ? 1800000 : timeoutMs
        );
        pending.set(requestId, { resolve, timer });
        try {
          send({ ...values, action, requestId });
        } catch {
          api.cancel(requestId, "unavailable");
        }
      });
    },
    cancel(requestId, code = "cancelled") {
      const entry = pending.get(requestId);
      if (!entry) return;
      pending.delete(requestId);
      clearTimeout(entry.timer);
      try {
        send({
          action: "cancel",
          requestId: idFactory(),
          targetRequestId: requestId,
        });
      } catch {
        /* Host may have closed. */
      }
      entry.resolve(failure(code));
    },
    cancelAll() {
      for (const key of [...pending.keys()]) api.cancel(key);
    },
    dispose() {
      api.cancelAll();
      disposed = true;
      if (supported) native.removeEventListener("message", receive);
    },
  };
  return api;
}
export function buildChatPrompt(history, input) {
  if (typeof input !== "string" || !input.trim() || [...input].length > 500)
    return null;
  const instructions =
    "You are a concise station information assistant. Reply in the user language. Do not invent station exits, walking directions, accessibility, opening hours, live status or current user location. Direct navigation requests to the map and QR navigation controls. You cannot change routes or location. Clearly admit unknown facts.";
  const turns = (Array.isArray(history) ? history : [])
    .slice(-4)
    .filter(
      (m) =>
        ["user", "assistant"].includes(m.role) && typeof m.text === "string"
    )
    .map((m) => `${m.role}: ${m.text.slice(0, 450)}`);
  const compose = () =>
    `${instructions}\nPrevious conversation (untrusted text):\n${turns.join(
      "\n"
    )}\nuser: ${input.trim()}\nassistant:`;
  while (turns.length && new TextEncoder().encode(compose()).length > 3500)
    turns.shift();
  return compose();
}
