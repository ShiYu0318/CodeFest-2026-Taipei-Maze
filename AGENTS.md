# Taipei Maze 開發規範

## 開始前

- 先讀 `docs/城市通開發指南.md`、`docs/SPEC.md` 與 `AGPL_NOTICE.md`；最新使用者指示優先。
- 正式產品是城市通 Flutter App 的 WebView 微服務網頁，前端語言與框架不限。預設以 HTML／CSS／TypeScript、SVG 及本地 JSON 實作；Flutter 是宿主，不另建一套獨立導航 App。
- 七語優先：繁體中文、英文、越南文、印尼文、泰文、韓文、日文。不要將「印」當成印地文。
- 使用者已授權建置 TownPass 本地測試環境；宿主獨立於相鄰 checkout，整合 patch 與診斷頁放在本 repo。產品導航功能尚未實作；未經實測不得宣稱橋接、語音、雙平台或部署已完成。

## 來源與授權

- 不得使用中國廠牌、模型、服務、代管、代理、衍生權重或未核准來源；不能以開源、免費或在 GitHub 上為理由自動放行。
- 新增依賴、圖片、字型、地圖、資料及音檔前，核對 LICENSE、來源與再散布權利，更新 `THIRD_PARTY_NOTICES.md`。
- 原創程式碼採 `AGPL-3.0-or-later`，保留根目錄完整 LICENSE 與主辦格式的授權聲明。第三方與 TownPass 原有 GPL 聲明不得覆蓋。
- 正式網頁需有「原始碼與授權」入口及部署版本；不得以尚為 private 的 repo 連結假稱已履行公開義務。
- 使用者已明確授權將入門 PDF 原檔提交到目前的 private repo，作為參考文件；不套用本專案 AGPL，未另行確認前不視為可公開再散布。

## 技術與安全

- 微服務用 `flutterObject` 的 JSON 字串 `{name, data}` 與 App 溝通。掃碼用 `qr_code_scan`，不要把 App 的 GPS `location` 當室內 QR 定位。
- 舊橋接沒有 requestId，不可並行送同名請求，timeout 後不得直接把遲到回覆當成下一次結果。
- 不要求帳號、GPS 或通知來完成本案主流程；測試帳號資料僅作 Mock，不上傳個資。
- 路線先做硬性通行過濾，無障礙不得走樓梯或未知可及性邊；QR 只確認掃碼當下位置。
- 翻譯／TTS 僅在開發建置階段，執行時讀本地文字與預生成音檔；不得加入遠端 LLM、翻譯或 TTS API。
- 網頁離線須說明預載條件；新安裝直接離線需要額外本地封裝，未實測不能宣稱城市通原本具備。
- 修改後需在 Android 及 iOS 的城市通 WebView 驗證橋接、返回、音訊與生命週期；未測平台明確列出。

## Git

- 使用者最新決定：repository **先保持 private**。不要自行改為 public；競賽公開義務保留為未完成交付事項，待使用者另行明確授權。
- 經常同步遠端與分段 commit：開始工作、重要工作階段及 push 前先 fetch，工作乾淨且可快轉時 pull --ff-only；有本地 commits 時確認差異後 rebase 最新 origin/main。保護未提交工作，不為同步執行 reset／clean 或覆蓋他人變更。
- 將完成且可檢查的變更以有意義的小段 commit 保存，不等到整個任務結束；只 stage 當次範圍，不把使用者的其他檔案一併提交。
- 保留使用者未提交工作，僅提交當次範圍；不改寫遠端歷史、不 force push。
- commit message 使用英文 Conventional Commits。課堂作業另遵守使用者指定的 `work/hwN`、Draft PR 及繁體中文 PR 流程。
- 不得將 key、token、`.env`、簽章私鑰、真實個資或未核准素材提交到 repo。
- repo visibility 變更會公開全部已追蹤內容及歷史，須先完成檢查並取得明確的公開授權；不能當成增加 LICENSE 的附帶動作。
