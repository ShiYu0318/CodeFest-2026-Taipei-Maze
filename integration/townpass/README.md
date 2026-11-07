# TownPass 本地測試整合

宿主獨立放在相鄰 `../TownPass` checkout，不將它的 `.git`、SDK、pub cache 或 build 產物加入本 repo。基準上游 commit 為 `c8e5d4d3f8f699f3d9d6cd68e129ed4da12037b3`，本地分支 `work/codefest-test-env`。

目前宿主的「CodeFest 測試環境」入口指向 `http://127.0.0.1:8082/station-map`。先在 `app/` 執行 `npm run serve -- --host 127.0.0.1 --port 8082`，再開啟 App 服務。Vue 變更由開發伺服器提供更新；WebView 未更新時退出服務再進入，HMR 在 App 內仍待人工驗證。

`smoke/` 是無額外前端依賴的橋接診斷頁，不是產品導航頁。只在使用者按鈕觸發時請求 deviceinfo／QR，不取得帳號或 GPS，不顯示裝置識別值，不保存 QR 內容。一般瀏覽器清楚顯示缺少 bridge。此診斷頁與新版地圖分開；需要 App 內診斷時，暫將宿主 destinationUrl 改回下列 8765 網址並重啟。

```bash
bash scripts/townpass-env.sh serve
```

本地網址 `http://127.0.0.1:8765/` 只監聽 loopback，供這台 Mac 的 iOS Simulator 使用，不對 LAN 或 Internet 開放。實機不能拿自己的 127.0.0.1 當這台 Mac；需要實機時另行設定可信測試網址，不應直接對外暴露全部服務。

宿主的 `CodeFest 測試環境` 服務入口修改會以 patch 保存於本目錄，保留 TownPass GPL 及著作權聲明。套用前核對基準 commit、工作目錄乾淨與 `git apply --check`，不要覆蓋其他宿主修改。環境實測與啟動方式見 [測試環境](../../docs/測試環境.md)。


持續模式使用新版 `qr_scan_session` handler，非循環呼叫舊掃碼頁。patch 另含原生單一相機、指引區與 session／guidance 版本防護，來源限制與操作方式見 [集合點與持續掃碼指南](../../docs/集合點與持續掃碼開發指南.md)。未套新版 patch 的宿主能力探測會失敗，網頁不會假稱常駐掃碼可用。

### 裝置端聊天與內建網頁包

目前 patch 另含 Google LiteRT-LM 0.19.1、原生本地語音、模型下載原生畫面與 loopback-only 網頁包。套用後先從作品 repo 執行 `bash scripts/townpass-env.sh bundle-web`，再 pub get／codegen／build；不要忘記產生 `assets/codefest_web.bundle`。此產物不提交宿主或 patch，由本 repo 的 Vue 原始碼重新生成。完整流程與未測限制見 [手機聊天與語音開發指南](../../docs/手機聊天與語音開發指南.md)。

## 定位指南針的 Flutter 介面

地圖右上角的指北按鈕開啟 `/station-orientation`。網頁使用既有的 `flutterObject` Web Message Listener。進入指南針時送出下列 JSON 字串，回到站圖後繼續顯示手機方位，離開這兩個頁面時送出相同訂閱編號的 `stop`。Flutter 團隊可在 TownPass 的 `TPWebMessageHandler` 註冊 `compass_heading`，從 `message` 取得 `action` 和 `subscriptionId`。 [InAppWebView 官方文件](https://inappwebview.dev/docs/webview/javascript/communication/#web-message-listeners)

```json
{"name":"compass_heading","data":{"action":"start","subscriptionId":1}}
```

在可信來源的主頁框收到 `start` 後，為該 WebView 開啟一個手機方位串流，透過既有的 `onReply` 把每筆讀數送回網頁。以手機螢幕上緣所指的方向為準，角度從真北順時針計算，北為 0°、東為 90°。有可用的角度誤差估計時才送 `accuracyDegrees`。

```dart
onReply?.call(replyWebMessage(data: {
  'subscriptionId': subscriptionId,
  'headingDegrees': headingDegrees,
  if (accuracyDegrees != null) 'accuracyDegrees': accuracyDegrees,
}));
```

感測器不可用時回傳相同訂閱編號，並將 `headingDegrees` 設為 `null`。收到 `stop`、App 進入背景、WebView 重新載入或關閉時，停止對應串流。App 回到前景且原頁仍在使用指南針時，以同一訂閱編號恢復更新。網頁在 5 秒未收到有效讀數後清除指針，並忽略其他訂閱的資料。Android 和 iOS 的感測器與權限處理由宿主接手。

測試頁的 `start` 和 `destination` 查詢參數分別保存 `station-points.json` 的起點與終點 ID，可轉成後端的 `startPointId` 與 `destinationPointId`。同層直線方位使用站圖目前向左偏 12° 的北向基準估算，仍待現場校正。跨樓層的下一步方位由後端路線提供。指南針可在一般瀏覽器用「模擬手機方位」操作。
