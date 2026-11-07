// SPDX-License-Identifier: AGPL-3.0-or-later
import { createQrBridge } from "../navigation/bridge.mjs";
import { createStationScanSession } from "./scan.mjs";
import { parseStationLocationQuery } from "./location-link.mjs";

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
    notice = "",
    generation = 0,
    disposed = false;
  const snapshot = () => ({
    ...session.snapshot(),
    active,
    available: bridge.available,
    mode: session.snapshot().position ? "navigation" : "browsing",
    notice,
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
        notice = "由定位連結帶入位置；請核對現場點位。";
      } else {
        session.reset();
        notice =
          result.type === "Browsing"
            ? ""
            : "定位參數無效或點位不存在，已返回瀏覽模式。";
      }
      publish();
      return result;
    },
    async scan() {
      if (disposed) return { type: "Unavailable" };
      if (active) return { type: "Busy" };
      const ticket = ++generation;
      active = true;
      notice = "等待城市通原生掃碼結果…";
      publish();
      const reply = await bridge.scan();
      if (disposed || ticket !== generation) return { type: "Stale" };
      const result =
        reply.type === "success" ? session.scan(reply.payload) : reply;
      if (result.type === "success") {
        notice = "定位已更新；您在這裡。選擇目的地或繼續查看地圖。";
        publish();
        try {
          await onLocated(result.point);
        } catch {
          if (!disposed && ticket === generation) {
            notice = "定位已更新，但網址同步失敗，請重新掃描。";
          }
        }
        if (disposed || ticket !== generation) return { type: "Stale" };
        active = false;
        publish();
      } else {
        active = false;
        notice =
          {
            Cancelled: "已取消掃描，原位置保持不變。",
            Unavailable: "請由城市通 App 開啟以使用原生掃碼。",
            Busy: "掃碼尚未結束，請先完成或關閉原生掃碼頁。",
            Timeout:
              "等待掃碼逾時。請先關閉原生掃碼頁；舊回覆清空前無法重掃，必要時關閉並重新進入服務。",
            WaitingForDrain:
              "仍在等待舊掃碼回覆。請先關閉原生掃碼頁，必要時關閉並重新進入服務。",
            SendFailed: "無法啟動掃碼。請關閉並重新進入服務後再試。",
            InvalidReply: "App 回傳格式不正確，原位置保持不變。",
          }[result.type] ?? "不是本地圖支援的定位碼，原位置與目的地保持不變。";
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
      notice = "";
      publish();
      try {
        await onLocated(null);
      } catch {
        notice = "網址同步失敗，請移除 point 參數後重新開啟地圖。";
        publish();
      }
    },
    suspend() {
      if (disposed) return;
      const wasActive = active;
      cancelPending();
      if (wasActive)
        notice = "掃碼已暫停，原位置保持不變。請先關閉原生掃碼頁。";
      publish();
    },
    dispose() {
      disposed = true;
      cancelPending();
    },
  };
}
