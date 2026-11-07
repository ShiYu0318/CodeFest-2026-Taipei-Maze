# TownPass 本地測試整合

## 從 TownPass 首頁掃碼開啟地圖

`qr-entry.patch` 在首頁右上角加入「掃描 QR Code」，呼叫既有原生掃描器。掃到現有 Codefest 定位 JSON 後，宿主驗證場域、版本及本地點位白名單，再開啟 `/station-map?point=<id>&v=1`。既有 89 張 QR 不需更換。相片掃碼也走相同結果處理；取消回首頁，未知／其他 QR 顯示提示。網頁呼叫 `qr_code_scan` 仍只收到原始文字，不會另開地圖或清掉原行程。

此 patch 可獨立套用上游基準，也可在 `test-env.patch` 之後套用。請先檢查宿主工作目錄並保護現有修改；不要把整份舊測試環境 patch 強套進已自訂的宿主。

```bash
git -C ../TownPass apply --check "$PWD/integration/townpass/qr-entry.patch"
git -C ../TownPass apply "$PWD/integration/townpass/qr-entry.patch"
python3 tools/generate-townpass-qr-catalog.py --check ../TownPass
```

預設開啟目前部署站 `http://home.yoyo899843.com:8000/station-map`；可用 Flutter `--dart-define=CODEFEST_MAP_URL=https://<部署站>/station-map` 指定受信任的部署入口。QR 本身不能指定 URL、座標、樓層或額外參數。透過網址進入時沿用網頁既有 `source=url`、無掃碼時間的標示，不假造 WebView 內的 QR 回覆。

此變更在 Flutter 宿主，**需要重新建置並安裝 TownPass**，只更新網站不會讓現有官方 App 多出首頁入口。Android／iOS 真機相機、相簿、取消與返回驗收仍待執行。原生點位清單由 `app/src/views/station-points.json` 產生；新增／停用點位後執行 `python3 tools/generate-townpass-qr-catalog.py ../TownPass` 並更新 patch，CI 會檢查兩邊一致。

## 既有測試宿主

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

## 行程方向確認

正式站內地圖沿用原版 TownPass 的 `qr_code_scan` 單次掃碼橋接。選好目的地或成功掃到本站定位碼後，網頁顯示兩步方向確認。先請使用者面向 QRcode 面板，再依已核對的跨樓層連結或現場導引指標確認方向。每步都需等待兩秒才能按「繼續」。

關閉按鈕與「退出導航」都會先詢問是否取消行程。確認取消後清除這次定位、起點和目的地。定位仍以掃碼當下確認的點位為準，步行路線由後端接手。
