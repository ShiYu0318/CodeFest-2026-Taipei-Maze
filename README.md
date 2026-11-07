# 2026 臺北秋季程式設計節城市通微服務大黑客松

Taipei Maze 北車不迷路：QR 定位、局部跨樓層路網、圖像指引與七語預生成語音，交付為城市通 WebView 微服務網頁。

## 開發文件

- [導航核心測試指南](./docs/導航核心測試指南.md)：合成路網、一般／無階梯選路、逐步導航、重定位與測試劇本。
- [本地測試環境](./docs/測試環境.md)：已安裝工具、實測結果、宿主位置及啟動指令。
- [城市通開發指南](./docs/城市通開發指南.md)：環境、宿主／網頁整合、橋接、Mock、部署及授權檢查。
- [2026 城市通入門指引 PDF](<./docs/2026 城市通入門指引.pdf>)：使用者提供的原始參考文件，保留原有權利。
- [作品五大面向評估與發展建議](./docs/作品五大面向評估與發展建議.md)：可行性、功能性、可靠性、易用性、亮點，以及風險、驗證與延伸構想。
- [產品與技術 SPEC](./docs/SPEC.md)：功能、資料契約、七語、離線及驗收。
- [提案企劃書](./docs/提案企劃書.md)：構想與決策歷程，架構以最新版 SPEC 為準。
- [競賽完整指南](./docs/2026-fall-competition-guide.md)：時程、規則與賽後義務；工作坊補充見開發指南。
- [研究資料包](./data/README.md)：48 項來源索引、10 份官方 CSV、UTF-8／北車子集、地圖入口與處理方法；尚非已驗證的產品路網。

目前已有研究資料、處理工具、本地 TownPass 測試環境，以及 `app/` 的 Vue 台北車站地圖原型。`compose.yml` 提供 nginx 容器設定，`compose.dev.yml` 提供 Vue CLI 開發設定。宿主另放在相鄰 checkout，診斷入口以 patch 保存。平台與橋接實測範圍見測試環境文件。

## 啟動站內地圖預覽

```bash
cd app
npm ci
npm run serve -- --port 8082
```

開啟 `http://localhost:8082/station-map`。導航核心測試另在 `http://localhost:8082/navigation-demo`，使用清楚標示的合成圖，可在真實走道資料完成前測試流程。原型提供 B1–B4 平面圖、設施主題、梯口端點與跨樓層預覽。站圖座標與轉乘資料存於 `app/src/views/`，目前為示意位置。`backend/` 保留原 Webview 的本機 Flask 測試 API，地圖以本地 JSON 載入。

## 授權與原始碼

原創程式碼採 **AGPL-3.0-or-later**，完整條款見 [LICENSE](./LICENSE)，主辦格式聲明見 [AGPL_NOTICE.md](./AGPL_NOTICE.md)。第三方及官方文件、地圖、字型、音檔等保留各自權利，見 [第三方紀錄](./THIRD_PARTY_NOTICES.md)。TownPass 上游仍保留 GPL-3.0 聲明。

[原始碼 repository](https://github.com/yoyo899843/Taipei-Codefest-2026-Big-Dumb)。依使用者 2026-11-07 最新決定，**先保持 private**；競賽要求的公開原始碼設定尚未完成，待另行明確授權後才公開並匿名驗證。未來部署畫面須顯著提供對應版本的「原始碼與授權」連結，包含必要建置與安裝資訊。

得獎公布後 repo 至少公開一年，並依主辦通知協助整併城市通。此一年是競賽最低維持期間，不代表 AGPL 授權到期。
