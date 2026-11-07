// SPDX-License-Identifier: AGPL-3.0-or-later
/** Legacy TownPass replies have no request ID: serialize, then drain before retrying. */
export function createQrBridge(bridge, timeoutMs = 60_000) {
  let pending = null,
    timer = null,
    draining = false,
    closed = false;
  const supported =
    !!bridge &&
    ["postMessage", "addEventListener", "removeEventListener"].every(
      (k) => typeof bridge[k] === "function"
    );
  function finish(result) {
    clearTimeout(timer);
    const resolve = pending;
    pending = null;
    resolve?.(result);
  }
  function onReply(event) {
    let reply;
    try {
      reply = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!reply || reply.name !== "qr_code_scan") return;
    if (draining) {
      draining = false;
      return;
    }
    if (!pending) return;
    finish(
      reply.data === null
        ? { type: "Cancelled" }
        : typeof reply.data === "string"
        ? { type: "success", payload: reply.data }
        : { type: "InvalidReply" }
    );
  }
  if (supported) bridge.addEventListener("message", onReply);
  return {
    get available() {
      return supported && !closed;
    },
    async scan() {
      if (!supported || closed) return { type: "Unavailable" };
      if (draining) return { type: "WaitingForDrain" };
      if (pending) return { type: "Busy" };
      return new Promise((resolve) => {
        pending = resolve;
        timer = setTimeout(() => {
          draining = true;
          finish({ type: "Timeout" });
        }, timeoutMs);
        try {
          bridge.postMessage(
            JSON.stringify({ name: "qr_code_scan", data: null })
          );
        } catch {
          draining = true;
          finish({ type: "SendFailed" });
        }
      });
    },
    dispose() {
      if (closed) return;
      closed = true;
      if (supported) bridge.removeEventListener("message", onReply);
      finish({ type: "Cancelled" });
    },
  };
}
