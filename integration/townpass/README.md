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
