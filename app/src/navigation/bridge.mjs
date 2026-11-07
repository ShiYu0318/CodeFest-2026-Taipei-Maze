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
export function createQrBridge(bridge, timeoutMs = 60_000) {
  let closed = false;
  const supported =
    !!bridge &&
    ["postMessage", "addEventListener", "removeEventListener"].every(
      (k) => typeof bridge[k] === "function"
    );
  const owner = Symbol("qr_owner");
  const channel = supported ? channelFor(bridge) : null;
  if (channel) {
    if (!channel.users.size)
      bridge.addEventListener("message", channel.onReply);
    channel.users.add(owner);
  }
  return {
    get available() {
      return supported && !closed;
    },
    async scan() {
      if (!supported || closed) return { type: "Unavailable" };
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
