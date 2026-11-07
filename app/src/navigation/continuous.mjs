// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
const newId = () =>
  [...globalThis.crypto.getRandomValues(new Uint8Array(16))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
/** New versioned native protocol. It cannot be emulated by repeatedly reopening legacy scanning. */
export function createContinuousScanner(native, options = {}) {
  const {
    onPayload = () => {},
    onAction = () => {},
    onStatus = () => {},
    idFactory = newId,
    timeoutMs = 2000,
  } = options;
  const supported =
    !!native &&
    ["postMessage", "addEventListener", "removeEventListener"].every(
      (k) => typeof native[k] === "function"
    );
  let available = false,
    disposed = false,
    active = false,
    sessionId = null,
    lastSeq = -1,
    probe = null;
  const send = (data) =>
    native.postMessage(JSON.stringify({ name: "qr_scan_session", data }));
  const finishProbe = (value) => {
    if (!probe) return;
    clearTimeout(probe.timer);
    const p = probe;
    probe = null;
    p.resolve(value);
  };
  function listener(event) {
    let reply;
    try {
      reply = JSON.parse(event.data);
    } catch {
      return;
    }
    if (
      reply?.name !== "qr_scan_session" ||
      !reply.data ||
      typeof reply.data !== "object"
    )
      return;
    const data = reply.data;
    if (probe && data.sessionId === probe.id && data.event === "capabilities") {
      available = data.continuous === true && data.protocol === 1;
      finishProbe({ type: available ? "success" : "Unavailable" });
      return;
    }
    if (
      !active ||
      data.sessionId !== sessionId ||
      !Number.isSafeInteger(data.seq) ||
      data.seq <= lastSeq
    )
      return;
    lastSeq = data.seq;
    if (
      data.event === "detected" &&
      typeof data.payload === "string" &&
      new TextEncoder().encode(data.payload).length <= 1024
    )
      onPayload(data.payload);
    else if (
      data.event === "action" &&
      data.action === "next" &&
      typeof data.guidanceToken === "string"
    )
      onAction({ action: "next", guidanceToken: data.guidanceToken });
    else if (data.event === "closed" || data.event === "error") {
      active = false;
      sessionId = null;
      onStatus(data.event);
    } else if (data.event === "started") onStatus("started");
  }
  if (supported) native.addEventListener("message", listener);
  const api = {
    get available() {
      return available && !disposed;
    },
    probe() {
      if (!supported || disposed)
        return Promise.resolve({ type: "Unavailable" });
      if (available) return Promise.resolve({ type: "success" });
      if (probe) return probe.promise;
      let id;
      try {
        id = idFactory();
      } catch {
        return Promise.resolve({ type: "Unavailable" });
      }
      if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id))
        return Promise.resolve({ type: "Unavailable" });
      let resolve;
      const promise = new Promise((done) => (resolve = done));
      probe = {
        id,
        resolve,
        promise,
        timer: setTimeout(
          () => finishProbe({ type: "Unavailable" }),
          timeoutMs
        ),
      };
      try {
        send({ action: "capabilities", sessionId: id });
      } catch {
        finishProbe({ type: "Unavailable" });
      }
      return promise;
    },
    start(guidance) {
      if (!available || disposed) return { type: "Unavailable" };
      if (active) return { type: "Busy" };
      try {
        sessionId = idFactory();
        if (typeof sessionId !== "string" || !/^[a-f0-9]{32}$/.test(sessionId))
          return { type: "Unavailable" };
        active = true;
        lastSeq = -1;
        send({ action: "start", sessionId, guidance });
        onStatus("starting");
        return { type: "success" };
      } catch {
        active = false;
        sessionId = null;
        return { type: "Unavailable" };
      }
    },
    update(guidance) {
      if (active && !disposed)
        try {
          send({ action: "update", sessionId, guidance });
        } catch {
          onStatus("error");
        }
    },
    stop() {
      if (active)
        try {
          send({ action: "stop", sessionId });
        } catch {
          /* Native may already have closed. */
        }
      active = false;
      sessionId = null;
      onStatus("stopped");
    },
    dispose() {
      if (disposed) return;
      api.stop();
      disposed = true;
      available = false;
      finishProbe({ type: "Unavailable" });
      if (supported) native.removeEventListener("message", listener);
    },
  };
  return api;
}
