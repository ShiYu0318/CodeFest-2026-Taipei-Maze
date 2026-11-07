# 第三方資源與授權紀錄

本檔區分「參考來源」與「已納入交付的依賴／素材」。列在參考表不代表已使用、已取得重製權、已通過非中國來源審查或允許再散布。

## 目前參考來源

| 項目 | 來源與用途 | 授權處理及狀態 |
| --- | --- | --- |
| AGPL 完整條款 | [GNU 官方純文字](https://www.gnu.org/licenses/agpl-3.0.txt)，存為根目錄 LICENSE | 原文逐字複製；授權文本本身之版權聲明保留 |
| TownPass | [taipei-doit/TownPass](https://github.com/taipei-doit/TownPass)，宿主與橋接參考 | 上游 LICENSE 為 GPL 第 3 版；目前未將上游專案複製進本 repo |
| TownPass-Services | [官方微服務範例](https://github.com/taipei-doit/TownPass-Services)，協定與結構參考 | 實際複製程式前逐檔核對 LICENSE、版權與來源；不假設與宿主同授權 |
| 2026 城市通入門指引 PDF | [使用者提供的原檔](<./docs/2026 城市通入門指引.pdf>)，作為開發文件來源 | 依使用者明確指示納入 private repo；不是本專案原創作品，不套用本專案 AGPL，公開再散布權利仍須另行確認 |
| 官方站圖、設施資料 | 見開發指南與 SPEC 的資料來源 | 尚未納入產品資產；使用及再散布前逐項核對 |
| 翻譯、語音、字型及模型候選 | 見 SPEC 第 13–16 節 | 尚無已生成音檔或已核准模型；不得將候選列成已安裝／已授權 |

## 實際依賴與素材登錄

目前 repository 包含文件、研究資料工具、本地環境 helper 與橋接診斷頁；診斷伺服器只使用 Node.js built-ins，未新增 npm 依賴。`integration/townpass/test-env.patch` 含 TownPass 原檔脈絡，保留上游 GPL 與著作權；宿主完整 checkout、SDK 與套件快取均未納入本 repo。前端既有依賴及鎖定資訊現已位於 app/package.json 與 app/package-lock.json；完整產品來源與發行審查仍待完成。實作時每項新增依賴或素材必須補上：

- 名稱、版本、檔案或 package 路徑、上游來源與實際提供者。
- SPDX 授權或條款連結、應保留的 Copyright／NOTICE。
- 是否可修改、公開原始碼、隨 App 或網頁再散布、移交主辦。
- 中國相關來源審查、審查人、日期及 approved／unverified／rejected 狀態。
- 模型或生成音檔另列原始模型／服務、生成方式、輸出權利及 hash。

MIT、常見 BSD-2-Clause／BSD-3-Clause、Apache-2.0 可作優先候選，但仍須保留適用通知及個別義務；「BSD」不能一概包含不相容的舊變體。「僅供個人使用」「不得再散布」、來源不明或不能符合交付權利者不得納入正式版本。

授權相容不等於符合來源限制。即使為 MIT，仍須遵守使用者「不得使用中國相關資源」的要求。

## 2026-11-07 研究資料副本

- `data/raw/` 收錄 10 份直接取自 `data.taipei` 的官方 CSV，提供者為臺北捷運公司與臺北市政府環境保護局。已逐項核對官方 metadata 的 `license_name` 為「依政府資料開放授權條款-第1版」，並核對平台條款；來源、取得時間、hash、審查範圍及顯名見 [data/ATTRIBUTION.md](./data/ATTRIBUTION.md) 與 [data/manifest.json](./data/manifest.json)。
- `data/processed/` 是上述 CSV 的編碼整理、北車／周邊篩選及候選點位，保留資料授權與來源，不改標 AGPL。這些是研究副本，並非完成現地驗證的導航資產。
- 地圖、站圖照片與 OSM 原始幾何沒有納入本次資料副本；`data/maps/` 只含連結，`data/queries/` 只含查詢文字與研究統計。日後選用另行核對來源、權利及資料授權。
- `tools/data/` 為本專案原創處理程式，依根目錄 `AGPL-3.0-or-later` 聲明；僅使用 Python standard library，未加入第三方套件或任何服務憑證。
- 研究副本獲准納入版本管理不代表產品 release gate 通過；`product_release_approved`／`release_approved` 仍為 false。

## 2026-11-07 Webview 地圖原型

- `app/` 地圖原型和 `backend/` 本機診斷 API 來自 [Team10 Webview 快照 `d88e71e`](https://github.com/Clare0808/team10_townpass_webview/commit/d88e71e)。匯入版本保留程式來源紀錄，原倉庫無獨立授權檔，公開交付前須釐清各部分的再散布權利。
- 地圖 SVG 與 JSON 為依 [臺北捷運站圖](https://web.metro.taipei/img/ALL/INFOPDF/051.pdf) 和 [臺北捷運剖面圖](https://web.metro.taipei/pages2026/WebStation/051/4) 重繪的示意原型。官方原圖及原 Webview 的示範圖片、favicon、環境檔與 Python 快取未匯入。站圖和衍生資料的公開交付權利仍待核對。
- npm 直接依賴見 `app/package.json`，鎖定版本、下載來源、完整性摘要及上游宣告授權見 `app/package-lock.json`。目前 lockfile 的下載來源為 `registry.npmjs.org`。`backend/requirements.txt` 為原有 Flask 診斷工具依賴，與地圖執行分開。以上均為 private 原型，供應鏈及發行授權審查仍待完成。


## 2026-11-07 合成導航核心

- `app/src/navigation/` 的核心模組、合成 fixture、`NavigationDemoView`／`NavigationDemoMap` 與 `app/tests/` 為本專案新增原創內容，依根目錄 AGPL-3.0-or-later；不改寫匯入 Webview 各部分的權利狀態。
- 合成地圖為程式繪製的簡單線段與節點，座標、文案與來源紀錄皆為測試用自製內容，沒有新增第三方圖資、照片、字型、模型、音檔、生成服務或 npm 依賴。
- 新測試只使用 Node.js built-in test runner；Vue CLI 與既有依賴仍沿用現有 lockfile，未宣稱完成整棵供應鏈或匯入原型的發行審查。


## 2026-11-07 規則式多語搜尋

- `app/src/search/`、DestinationSearch 元件與新增測試為原創程式，依 AGPL-3.0-or-later，未新增 npm 依賴或模型。
- `dictionary.json` 為團隊撰寫的七語原型種子詞及意圖，不含下載詞庫或外部翻譯服務產出；全部 alias／規則保留 draft、來源與待語言校對狀態。原型頁面明示草稿，正式詞典發布仍需逐語審查。
- 真實設施名稱沿用已記錄的站圖原型資料，不將搜尋命中當成場站或權利驗證。合成廁所可及性是測試假設，不是實地認證。


## 2026-11-07 集合分享與持續掃碼

- 集合連結、白名單、合成集合 POI、持續掃碼協定及新增原生指引檔案為原創內容，依 AGPL-3.0-or-later；未引入真實等候空間或他人位置資料。
- 相機沿用 TownPass lockfile 的 mobile_scanner 7.4.2，無新增 SDK／下載鏡像；宿主原有 GPL、版權及套件授權繼續保留，新增原創程式透過 patch 移交。
- 沒有新增聊天模型、語音模型、分享圖像套件或自動傳訊服務；Gemma／語音工作仍獨立核對來源與權利。

## 手機裝置端聊天整合（2026-11-07）

- Google LiteRT-LM 0.19.1：Apache-2.0，Swift SPM／Google Maven 官方來源；完整授權存於 `integration/townpass/licenses/LiteRT-LM-Apache-2.0.txt`。SDK 自有相依套件與 NOTICE 仍須隨 native 發行版本保留。
- Dart `crypto` 3.0.7、Flutter `path_provider` 2.1.6：Google Dart／Flutter 作者，BSD-3-Clause；原宿主已鎖定為間接依賴，本輪改為直接使用。完整授權存於 `integration/townpass/licenses/`。
- Gemma 3 1B INT4：Google 開放權重、Gemma 專屬條款；官方 Gallery 所列 HF commit 與檔案固定，取得使用者授權與 SHA-256 核對後才安裝，不包含權重或 Token。不是 AGPL 權重再授權。
- Apple Speech、Android SpeechRecognizer 是平台 API；只允許 Apple／可識別 Google 的裝置端 provider。未採用中國模型、廠牌服務、代理或來源不明權重。
- GitHub Android CI 使用 GitHub 官方 `actions/checkout` 固定 SHA、官方 Flutter 固定 commit 與 runner 預裝的 Google SDK／NDK；不自動接受 preview license。
