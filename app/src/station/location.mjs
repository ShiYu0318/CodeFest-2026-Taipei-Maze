// SPDX-License-Identifier: AGPL-3.0-or-later
import { createQrBridge } from "../navigation/bridge.mjs";
import { createStationScanSession } from "./scan.mjs";
import { parseStationLocationQuery } from "./location-link.mjs";
import zhTW from "../i18n/messages/zh-TW.mjs";

const knownFailures = new Set([
  "Cancelled",
  "Unavailable",
  "Busy",
  "Timeout",
  "WaitingForDrain",
  "SendFailed",
  "InvalidReply",
]);

/** Framework-independent owner of one native scan and the last supplied position. */
export function createStationLocation({
  data,
  connections,
  native,
  timeoutMs = 60_000,
  onChange = () => {},
  onLocated = () => {},
}) {
  const session = createStationScanSession(data, connections);
  let bridge = createQrBridge(native, timeoutMs),
    active = false,
    noticeKey = "",
    generation = 0,
    disposed = false;
  const snapshot = () => ({
    ...session.snapshot(),
    active,
    available: bridge.available,
    mode: session.snapshot().position ? "navigation" : "browsing",
    noticeKey,
    // Traditional Chinese text kept for callers that do not localize.
    notice: noticeKey ? zhTW[noticeKey] : "",
  });
  const publish = () => {
    if (!disposed) onChange(snapshot());
  };
  function cancelPending() {
    generation++;
    bridge.dispose();
    if (!disposed) bridge = createQrBridge(native, timeoutMs);
    active = false;
  }
  function mutate(action) {
    if (active || disposed) return false;
    const result = action();
    publish();
    return result;
  }
  return {
    snapshot,
    // Republish availability when the unchanged TownPass host becomes ready.
    refreshNative: publish,
    applyQuery(query) {
      if (disposed) return { type: "Unavailable" };
      const result = parseStationLocationQuery(query, data);
      if (
        result.type === "success" &&
        session.snapshot().position?.pointId === result.point.id
      )
        return result; // A QR's own router update must preserve its source and time.
      cancelPending();
      if (result.type === "success") {
        session.locatePoint(result.point.id, "url");
        noticeKey = "notice.linkLoaded";
      } else {
        session.reset();
        noticeKey = result.type === "Browsing" ? "" : "notice.linkInvalid";
      }
      publish();
      return result;
    },
    async scan() {
      if (disposed) return { type: "Unavailable" };
      if (active) return { type: "Busy" };
      const ticket = ++generation;
      active = true;
      noticeKey = "notice.waiting";
      publish();
      const reply = await bridge.scan();
      if (disposed || ticket !== generation) return { type: "Stale" };
      const result =
        reply.type === "success" ? session.scan(reply.payload) : reply;
      if (result.type === "success") {
        noticeKey = "notice.located";
        publish();
        try {
          await onLocated(result.point);
        } catch {
          if (!disposed && ticket === generation) {
            noticeKey = "notice.locatedUrlFailed";
          }
        }
        if (disposed || ticket !== generation) return { type: "Stale" };
        active = false;
        publish();
      } else {
        active = false;
        noticeKey = knownFailures.has(result.type)
          ? `notice.${result.type}`
          : "notice.unsupportedCode";
        publish();
      }
      return result;
    },
    choose: (id) => mutate(() => session.setDestination(id)),
    searchSelect: (selection) =>
      mutate(() => session.applySearchSelection(selection)),
    setStepFree: (value) => mutate(() => session.setStepFree(value)),
    markUnavailable: (id) => mutate(() => session.markUnavailable(id)),
    confirmArrival: (token) => mutate(() => session.confirmArrival(token)),
    async reset() {
      if (disposed) return;
      cancelPending();
      session.reset();
      noticeKey = "";
      publish();
      try {
        await onLocated(null);
      } catch {
        noticeKey = "notice.resetUrlFailed";
        publish();
      }
    },
    suspend() {
      if (disposed) return;
      const wasActive = active;
      cancelPending();
      if (wasActive) noticeKey = "notice.suspended";
      publish();
    },
    dispose() {
      disposed = true;
      cancelPending();
    },
  };
}
