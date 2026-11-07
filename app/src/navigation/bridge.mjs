// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
// Keep native channel ownership across route remounts and development HMR.
const registryKey = Symbol.for("taipei_maze.qr_channels");
const channels =
  globalThis[registryKey] ?? (globalThis[registryKey] = new WeakMap());
function channelFor(bridge) {
  if (channels.has(bridge)) return channels.get(bridge);
  const channel = {
    users: new Set(),
    pending: null,
    timer: null,
    draining: false,
  };
  channel.finish = (result) => {
    clearTimeout(channel.timer);
    const pending = channel.pending;
    channel.pending = null;
    pending?.resolve(result);
  };
  channel.onReply = (event) => {
    let reply;
    try {
      reply = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!reply || reply.name !== "qr_code_scan") return;
    if (channel.draining) {
      channel.draining = false;
      return;
    }
    if (!channel.pending) return;
    channel.finish(
      reply.data === null
        ? { type: "Cancelled" }
        : typeof reply.data === "string"
        ? { type: "success", payload: reply.data }
        : { type: "InvalidReply" }
    );
  };
  channels.set(bridge, channel);
  return channel;
}
/** Legacy replies have no request ID. Share ownership, serialize and drain before retrying. */
export function createQrBridge(native, timeoutMs = 60_000) {
  let closed = false,
    bridge = null,
    channel = null;
  const owner = Symbol("qr_owner");
  function connect() {
    if (closed) return false;
    if (channel) return true;
    // The host may inject flutterObject after the web page starts mounting.
    const candidate = typeof native === "function" ? native() : native;
    if (
      !candidate ||
      !["postMessage", "addEventListener", "removeEventListener"].every(
        (key) => typeof candidate[key] === "function"
      )
    )
      return false;
    bridge = candidate;
    channel = channelFor(bridge);
    if (!channel.users.size)
      bridge.addEventListener("message", channel.onReply);
    channel.users.add(owner);
    return true;
  }
  connect();
  return {
    get available() {
      return connect();
    },
    async scan() {
      if (!connect()) return { type: "Unavailable" };
      if (channel.draining) return { type: "WaitingForDrain" };
      if (channel.pending) return { type: "Busy" };
      return new Promise((resolve) => {
        channel.pending = { resolve, owner };
        channel.timer = setTimeout(() => {
          channel.draining = true;
          channel.finish({ type: "Timeout" });
        }, timeoutMs);
        try {
          bridge.postMessage(
            JSON.stringify({ name: "qr_code_scan", data: null })
          );
        } catch {
          channel.draining = true;
          channel.finish({ type: "SendFailed" });
        }
      });
    },
    dispose() {
      if (closed) return;
      closed = true;
      if (!channel) return;
      if (channel.pending?.owner === owner) {
        channel.draining = true;
        channel.finish({ type: "Cancelled" });
      }
      channel.users.delete(owner);
      if (!channel.users.size)
        bridge.removeEventListener("message", channel.onReply);
    },
  };
}
