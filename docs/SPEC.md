# Taipei Maze 北車不迷路產品與技術規格

版本：1.2｜更新日期：2026-11-07｜文件狀態：開發規格，尚非完成實作或現場安全認證

本規格將[提案企劃書](./提案企劃書.md)轉為可分工、實作、測試與交付的要求。產品讓旅客掃描 QR Code 確認位置，以局部跨樓層路網規劃路線，再透過一步一圖、多語文字與預生成語音理解下一步。核心承諾是「找得到、走得了、看得懂」，不能用完整功能數量取代路線正確性。

**最新使用者指示優先：介面與語音優先支援繁體中文、英文、越南文、印尼文、泰文、韓文、日文，共七種。** 使用者同時說「五種」與列出七種，本規格依明列清單採七種；「印」依提案原有語言清單解讀為印尼文，不是印地文。若日後更正，需同步更動語系矩陣、資產及驗收，不可只改說明文字。

**來源限制為必要條件：不得使用中國廠牌、模型、服務或相關未經核准資源。** 本文件制定可稽核的選用、來源與打包門檻；不將單看品牌名稱或套件註冊站點視為完整供應鏈證明。語言為繁體中文不等於採用中國供應商。

## 目錄

- [01 文件效力與決策紀錄](#01-文件效力與決策紀錄)
- [02 產品目標與使用者](#02-產品目標與使用者)
- [03 交付範圍與優先級](#03-交付範圍與優先級)
- [04 平台與城市通整合](#04-平台與城市通整合)
- [05 使用流程與畫面](#05-使用流程與畫面)
- [06 功能需求](#06-功能需求)
- [07 導航狀態與一致性](#07-導航狀態與一致性)
- [08 資料封裝與版本](#08-資料封裝與版本)
- [09 路網與定位資料契約](#09-路網與定位資料契約)
- [10 路徑演算法與無障礙](#10-路徑演算法與無障礙)
- [11 方向與指令生成](#11-方向與指令生成)
- [12 地圖繪製與樓層](#12-地圖繪製與樓層)
- [13 七語介面規格](#13-七語介面規格)
- [14 快速翻譯與語音製作流程](#14-快速翻譯與語音製作流程)
- [15 離線語音與播放契約](#15-離線語音與播放契約)
- [16 非中國來源與授權門檻](#16-非中國來源與授權門檻)
- [17 架構與模組介面](#17-架構與模組介面)
- [18 例外處理與恢復](#18-例外處理與恢復)
- [19 非功能需求](#19-非功能需求)
- [20 隱私與資料安全](#20-隱私與資料安全)
- [21 多目標認知路線與離線目的地搜尋](#21-多目標認知路線與離線目的地搜尋)
- [22 測試資料與案例](#22-測試資料與案例)
- [23 驗收與證據](#23-驗收與證據)
- [24 開發分工與時程](#24-開發分工與時程)
- [25 建置交付與維護](#25-建置交付與維護)
- [26 競賽展示與評分對齊](#26-競賽展示與評分對齊)
- [27 未決事項與風險](#27-未決事項與風險)
- [28 需求追溯與完成定義](#28-需求追溯與完成定義)
- [29 參考來源](#29-參考來源)

## 01 文件效力與決策紀錄

### 01.1 資料優先順序

1. 使用者最新提供的《2026 城市通入門指引》及架構資訊：作品為 WebView 微服務網頁、前端框架不限；七語與排除中國相關來源要求繼續適用。
2. 提案第 18 章新增多目標路線與離線搜尋，及第 17、15 章功能取捨；認知排序、字典搜尋與未來 ML 先列 P1。
3. 提案第 13、14 章的預生成音檔決策保留；獨立 Flutter 導航客戶端已被本次 WebView 架構覆寫，Flutter 改作城市通宿主。
4. 提案較早章節的長期願景，僅在不牴觸上述決策時採用。
5. 本 SPEC 補充的工程預設。這些是為使規格可執行而制定，不代表使用者曾逐項指定。

來源基準為提案最近一次提交 `19182be56d9edab30a66fac12bc8fadf5e09279e`。本次另在原提案開頭標明架構更正；不採用來源未核准圖片作為已授權底圖。開發實務見[城市通開發指南](./城市通開發指南.md)。

### 01.2 規範詞與狀態

| 用詞 | 意義 |
| --- | --- |
| 必須／不得 | 驗收條件，不符合不得宣稱對應功能已完成 |
| 應 | 預設實作方式；變更須記錄理由、替代方式及受影響測試 |
| 可 | 選配，不影響 P0 完成定義 |
| 工程預設 | 本 SPEC 所選的可執行方案，尚未實機驗證 |
| 待確認 | 有指定負責人、期限及無法確認時的處置，不得當成已核准 |
| P0／P1／P2 | 必交閉環／有餘裕擴充／本次不交付 |

### 01.3 關鍵決策

| ID | 決策 | 來源或理由 |
| --- | --- | --- |
| ADR-01 | 正式作品為城市通 Flutter App 內的 WebView 微服務網頁；路網、文字、地圖及音檔為可封裝靜態資產 | 最新入門指引第 9 頁覆寫舊獨立 App 決策 |
| ADR-02 | 網頁端純 TypeScript Dijkstra；P0 無後端、無 LLM、無執行期翻譯或 TTS | 原演算法契約保留，執行端更正 |
| ADR-03 | P0 七語介面與固定語音；不只三語 | 使用者本輪更新，覆寫原三語 MVP |
| ADR-04 | 重新掃碼定位為 P0；不能假裝有連續定位 | 提案第 15、17 章 |
| ADR-05 | 通行條件先做硬性過濾；模型或偏好不得放寬 | 提案已定 |
| ADR-06 | 位置由掃碼確認，步驟由使用者確認，兩者分開保存 | 工程預設，避免虛構即時位置 |
| ADR-07 | 一份 TypeScript session store；掃碼採 TownPass bridge adapter，播放用 HTMLAudioElement，儲存用本地 adapter | 工程預設，不強制引入框架或 Riverpod |
| ADR-08 | 開發期翻譯／語音服務採允許清單，首選候選為 Microsoft 全球 Azure 服務 | 工程建議，非已採購或已核准；不得使用中國營運雲或來源不明替代模型 |
| ADR-10 | 使用者新增目的地優先與持續掃描：明確啟動後每個有效 QR 自動更新起點、保留終點重算，相機不反覆重開；朝向／步驟／到層仍需確認 | 2026-11-07 最新使用者指示；單次掃碼保留備援 |
| ADR-09 | 本次更新文件與 AGPL 設定，不代表微服務、宿主修改、七語素材或測試已完成 | repo 公開與產品原始碼入口另需完成 |

## 02 產品目標與使用者

### 02.1 問題

臺北車站的多樓層、轉乘系統與出口需要使用者自行把平面圖、所在位置、目的地及方向連結起來。產品降低理解與操作負擔，不要求使用者先學會閱讀完整車站圖。

### 02.2 使用者需求

| 需求情境 | 可觀察的障礙 | 產品回應 | 不採用的推論 |
| --- | --- | --- | --- |
| 外籍旅客 | 不理解中文文字與地標 | 七語文字、圖示、本地語音、保留站內原文對照 | 不依國籍自動推斷語言 |
| 兒童或初次使用者 | 難同時記住整張圖及多個步驟 | 簡易模式，一次一動作，具體地標 | 不蒐集年齡，不認定兒童一定無法讀圖 |
| 數位素養不足 | 搜尋、縮放、選單操作困難 | 大型目的地卡、少層級、明顯的重新掃碼入口 | 不把所有人強制導向簡易模式 |
| 行動需求不同 | 樓梯、電扶梯或受限通道不可走 | 無障礙硬限制、可驗證電梯路線、無路線提示 | 不以高分數交換不可通行路段 |

### 02.3 成功條件

- 至少兩組不同起訖點能完成掃碼、目的地、跨樓層、步驟、語音、重新定位及抵達流程。
- 同一組起訖點可展示一般路線與無障礙路線差異，或明確回報無障礙路線不存在。
- 核心操作不需要輸入文字、不登入、不提供個資；搜尋可選。
- 七種語言的必要畫面與 24 個核心語音句均有可驗證資產。
- 實機離線冷啟動與三次連續主流程演練成功，不能只測曾快取的線上版本。
- 所有實際使用的來源、依賴及音檔權利可追溯；沒有未核准的中國相關資源。

### 02.4 非目標

本次不提供全站覆蓋、GPS／藍牙連續定位、即時設備故障資料、緊急疏散建議、無人確認的安全導航、即時翻譯、即時 TTS、LLM／OCR、360 度環景、完整 Graph Editor、帳號及社群功能。P1 模型不影響 P0。

## 03 交付範圍與優先級

### 03.1 P0 範圍

| 項目 | 最低交付 | 完成證據 |
| --- | --- | --- |
| 場域 | 同一連續示範區域的 B1、B2 | 範圍圖、路網及資料說明 |
| 路網 | 20–30 節點，包含走道、交會、樓梯、電梯及 POI | 資料驗證通過，不以節點數代替有效連通 |
| QR | 4–6 個不同定位點，其中至少 2 點用於重新定位 | 列印 QR、對照表、實機測試 |
| 目的地 | 4–6 個，至少涵蓋出口、廁所、電梯 | 每個目的地具可到達節點與多語名稱 |
| 路線 | 最短可行、無障礙，跨 B1／B2 | 路徑測試與地圖疊圖 |
| 指引 | 一步一圖、地標、樓層、手動步驟確認 | 指令與路線共用版本 |
| 自適應 | 標準／簡易；大字、高對比 | 同一任務不同呈現，操作狀態保留 |
| 重新定位 | 「我迷路了」→ 掃新 QR → 重算 | 同路線前後與偏離節點案例 |
| 語言 | `zh-TW`、`en`、`vi`、`id`、`th`、`ko`、`ja` | 必要介面翻譯 100%，24 句 × 7＝168 個核心音檔 |
| 離線 | 路網、地圖、文字、字型、音檔及掃碼元件所需資源本地可用 | 飛航模式冷啟動測試 |
| 交付 | 可執行版本與經確認的城市通整合方式 | 交付形式確認紀錄 |

節點、QR、目的地數量是最低展示規模，不表示這些資料已存在。若資料未經現場核對，只能標「示意測試場景」，不得以北車真實可通行路線對外發布。

### 03.2 P1

1. 以 Graph 距離找最近廁所／電梯，不使用直線距離代替可達距離。
2. 多目標候選路線比較：有可信時間模型才稱「最快」，否則顯示「最短」；另提供候選中較容易理解的路線，保留無障礙硬限制。
3. 語速 0.8／1.0／1.2 倍、較完整的播放佇列、語言包擴充。
4. 小型志願者可用性測試；只呈現實際樣本與條件。
5. 離線多語目的地搜尋：七語同義詞、有限錯字容忍、簡單意圖及 Graph 最近可達設施。主流程仍可用大卡片，不強迫輸入文字。

### 03.3 時間不足的降級規則

先停 P1，再縮減 POI 數、非必要介面裝飾與音檔擴充。不得自行把七語改回三語、略過通行檢查、偽造翻譯已校對或把錯誤導引藏起來。若七語未達標，記錄為未完成項，清楚標示實際支援語系，不能宣稱符合本版 P0。

## 04 平台與城市通整合

### 04.1 正式架構

```text
城市通 App（Flutter 宿主）
  ├── 服務註冊：destinationUrl
  ├── WebView／flutterObject 雙向橋接
  └── 原生 QR 掃描及必要的本地 bundle 載入
           ↕ JSON 字串 {name,data}
Taipei Maze 微服務網頁（HTML／CSS／TypeScript）
  ├── SVG／Canvas 地圖與路線
  ├── Dijkstra、無障礙過濾、導航狀態
  ├── 七語 JSON 與 HTMLAudioElement
  └── 靜態 Graph／地圖／字型／音檔 package
           ↕ 選配 API（P0 不需要）
開放資料與未來必要的後端
```

前端語言及框架不限，官方 Vue 3 僅為範例。本案工程預設原生 HTML／CSS／TypeScript，避免不必要依賴；所有新增工具仍需來源及授權審查。不可再將獨立 Flutter App 或 APK 下載頁當作正式微服務。

### 04.2 宿主版本與交付門檻 GATE-01

已核對 TownPass commit `c8e5d4d3f8f699f3d9d6cd68e129ed4da12037b3`：Flutter 3.47.6、Dart `>=3.13.0 <4.0.0`、AGP 9.1.0、Kotlin 2.4.0、Gradle 9.3.1，Java target 17。PDF 概稱 iOS 15，該快照 Runner target 為 15.5，測試須以實際 target 為準；上游保留 SPM 與 Podfile 設定。

GATE-01 不再是「Flutter 能否當作品」的開放選項，而是必須完成：真實 HTTPS／封裝入口註冊、從 Android／iOS 城市通開啟、QR bridge 往返、返回及生命週期、對應原始碼。基準裝置、OS、宿主 commit 及修改 patch 需記錄。宿主建置依其 `.fvmrc`，本 repo 根目錄尚非 Flutter 專案，不新增虛假的宿主設定。

### 04.3 掃碼橋接

網頁先監聽 `flutterObject` 的 message，再送 `JSON.stringify({name:'qr_code_scan',data:null})`。回覆仍為 JSON 字串，data 只接受字串；null 視為取消，其他型別視為協定錯誤。原始字串再進本地 QrDecoder，不能直接當 URL 開啟。GPS `location` 不作本案室內定位。

舊橋接沒有 requestId，最多一個掃碼在途。工程預設 60 秒等待提示；逾時不自動重送，該通道進 waiting_for_drain，遲到結果只丟棄、不定位，收到後才可再掃。未收到前須退出原生掃碼並重新開啟服務；若仍無法保證清空，需最小自訂 handler 加 correlation ID 並測試，不能假設 Web 自建 ID 會被舊宿主回傳。

一般瀏覽器沒有 flutterObject，顯示需在城市通開啟或明確 demo_manual adapter，不能偽造掃碼成功。WebView 暫時被原生掃碼覆蓋時保留 listener 與 pending；頁面真正卸載才清理。原生端限制可信 origin、main frame 與能力，不全域開放任意網站呼叫。

### 04.4 離線交付

原「新安裝首次離線」目標保留，需把完整 `web/dist/` 封裝進宿主並實作可信本地載入，**不是只填 destinationUrl 就有的官方能力**。遠端 HTTPS 服務與內嵌 bundle 使用同一內容 hash；必要宿主修改、origin、base path、音訊及 bridge 權限須在雙平台實測。

開頁後斷網、預載快取後離線重開、全新安裝的內嵌離線是三個不同案例。未完成內嵌載入時標 GATE-06 未通過，不把原先要求默默降成只有預載。宿主既有帳號／定位／通知不是本案必需資料；P0 不新增後端。

## 05 使用流程與畫面

### 05.1 主流程

```text
首次啟動／資料驗證
  → 選語言與模式
  → 先選目的地與路線需求
  → 明確啟動持續掃描（或單次掃碼備援）
  → 有效 QR 更新定位點、樓層與確認時間
  → 規劃路線並顯示概要
  → 確認出發朝向／地標
  → 一步一圖導航＋本地語音
  → 使用者確認下一步／再次掃碼
  → 新定位後重算，或確認抵達
```

### 05.2 畫面規格

| 畫面 ID | 主要內容與動作 | 返回與狀態 |
| --- | --- | --- |
| SCR-01 啟動 | 載入資產、版本檢查；錯誤時重試或看資料說明 | 驗證失敗不得進導航 |
| SCR-02 首頁 | 七語切換、標準／簡易、掃碼開始、示範範圍 | 未掃碼不顯示虛構目前位置 |
| SCR-03 掃碼 | 相機框、手電筒（裝置支援才顯示）、權限提示、取消 | 取消回原畫面，保留既有路線 |
| SCR-04 位置確認 | 定位點標籤、樓層、地標、來源、時間；確認或重掃 | 明確顯示「上次確認位置」 |
| SCR-05 目的地 | 4–6 個大卡片、分類圖示、樓層、通行需求開關 | 未定位時引導先掃碼 |
| SCR-06 路線概要 | 起終點、跨層方式、距離可信度、一般／無障礙差異、開始 | 變更需求重算；失敗保留可重試選擇 |
| SCR-07 導航 | 大箭頭、單一步驟、地標、樓層、進度、地圖、重播、靜音、下一步、我迷路了 | 返回先詢問是否結束導航，不默默重置 |
| SCR-08 跨樓層 | 搭乘方式、目標樓層、到層確認或 QR 驗證 | 手動切圖不等於到層 |
| SCR-09 重新定位 | 暫停語音、掃新 QR、新位置確認、重算結果 | 失敗／取消不得把新位置部分寫入舊路線 |
| SCR-10 抵達 | 目的地名稱、圖示、確認方式、重新開始 | 只有手動或有效 QR 確認後顯示已抵達 |
| SCR-11 設定與來源 | 語言、模式、靜音、資料來源／版本／範圍、素材聲明 | 變更呈現不改變路線偏好 |
| SCR-12 無路線 | 原因分類、重選目的地、重掃、保留目前需求 | 不提供違反無障礙條件的替代路線 |

### 05.3 首次使用與最少操作

預設語系依裝置語言匹配，無匹配時英文；首頁始終可改為繁中或其他六語。首次進入可見七語原文選單，不能要求先讀懂英文。語言記錄本機，介面模式預設標準，語音預設開啟但首次需使用者按「開始導航／播放」觸發。

主流程不要求搜尋鍵盤、不要求讀設定頁。優先選目的地再啟動持續掃描；使用者已明確同意有效碼自動更新時，才依第 06.1 節提交新起點。單次備援仍先顯示位置確認，不將未通過驗證的碼靜默寫入。

## 06 功能需求

### 06.1 掃碼與位置

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-QR-01 | 只接收本專案支援版本的 QR payload | URL、任意字串、錯誤 JSON 不可導向外部頁面 |
| FR-QR-02 | QR 對應一個場域、路網主版本與 anchor | 不存在、停用、其他場域或不相容版本均明確拒絕 |
| FR-QR-03 | 單次模式成功後停止；持續模式保持相機並去除重複影格 | 不同有效定位碼可持續更新；同碼可明確重新讀取，不以反覆重開相機模擬連續模式 |
| FR-QR-04 | 權限拒絕可取消、重試或依 OS 前往設定 | 不閃退、不無限彈窗、不謊稱已定位 |
| FR-QR-05 | 保留掃碼時間、anchor、節點與來源 | 不上傳相機畫面或定位紀錄 |
| FR-QR-06 | 沒有連續定位時不移動「已確認位置」點 | 使用者按下一步只能改步驟，不能更新掃碼位置 |

持續模式依最新使用者指示增補：使用者按「有效碼自動更新」明確啟動後，有效 anchor 可直接成為新的確認位置並重算；單次模式仍保留位置確認。分享連結不是 anchor，錯碼不覆寫位置。目的地與自身限制保留，起始／到層方向仍需核對，不能把讀碼當作手機朝向。這是離散 QR 更新，不是 GPS 或連續追蹤。

Native 下一步需攜帶畫面上的 guidanceToken（route revision／phase／step），web 拒絕舊 token；native 點擊或偵測 QR 後先停用按鈕，收到新 guidanceVersion 才啟用，避免新定位與舊按鈕混用。

### 06.2 目的地與路線

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-RT-01 | 起點取自已確認定位，目的地取自 POI | 缺起點、目的地或有效圖時不可開始導航 |
| FR-RT-02 | 一般模式算最短可行路徑 | 已封閉、方向不符、付費區不符的邊一律排除 |
| FR-RT-03 | 無障礙模式做硬性過濾 | 不走樓梯、電扶梯、不可及或無障礙未知邊 |
| FR-RT-04 | 跨樓層只透過有效 connector | 不以相同 x/y 自動連樓層 |
| FR-RT-05 | 切換無障礙條件重算，不回退一般模式 | 新路線不可行時明確無路線，原路線只可作歷史摘要 |
| FR-RT-06 | 同起終點立即提供抵達確認 | 不產生零長度轉向或重複路徑 |
| FR-RT-07 | 路線結果具 requestId、graphVersion、routeRevision | 舊請求較晚完成不可覆蓋新選擇 |
| FR-RT-08 | 說明距離是公尺或相對距離 | 未校準資料不能顯示「30 公尺／步行幾分鐘」 |

### 06.3 導航與重新定位

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-NV-01 | 同時只有一個 active instruction | 文字、箭頭、語音引用同一指令及路線版本 |
| FR-NV-02 | 步驟由使用者明確確認，保留返回上一步 | 未導入定位感測前不得用計時器自動推進 |
| FR-NV-03 | 每一步提供具體地標或清楚參照 | 沒有可靠初始朝向時不直接指令「向左」 |
| FR-NV-04 | 跨層到達必須手動確認或再次掃碼 | 切換地圖不代表使用者已換層 |
| FR-NV-05 | 「我迷路了」隨時可用 | 在導航畫面一個可見按鈕進入重掃 |
| FR-NV-06 | 有效新掃碼保留目的地與通行需求，重新規劃 | 不能只剪裁舊路徑而忽略實際新起點 |
| FR-NV-07 | 抵達須使用者確認，或掃到有效目的地 anchor | 選了最後一步、切到終點樓層不自動宣告實際抵達 |
| FR-NV-08 | 重掃失敗／取消可回原指引 | 保留舊 routeRevision 與上次確認位置，提示仍未重新定位 |

### 06.4 多語與易讀

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-I18N-01 | 七語覆蓋 P0 全部必要介面與指令 | 不顯示 key、空字串或混入未標示的繁中 |
| FR-I18N-02 | 語言切換即時生效並持久化 | 保留目的地、路線、步驟；停止舊語音再播新語音 |
| FR-I18N-03 | 地標保留站內原文對照 | 外語名稱與場站實際標示可對照，不自行創造地標 |
| FR-UI-01 | 標準／簡易切換無需輸入年齡 | 簡易模式確實改變字級、選項密度及下一步呈現 |
| FR-UI-02 | 圖像、文字、語音可各自理解 | 靜音、音檔缺失或色覺差異不阻斷主流程 |
| FR-UI-03 | 文字放大、長翻譯與字型缺字可測 | 200% 文字縮放不遮住主要操作；泰文上下標不裁切 |

### 06.5 音訊、離線與來源

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-AUD-01 | 導航只播放 assets 預生成音檔 | runtime 無 TTS／翻譯／模型 API |
| FR-AUD-02 | 重播、播放／暫停與靜音 | 重播從當前指令開頭；暫停不推進導航 |
| FR-AUD-03 | 新指令與重規劃中止舊語音 | 不交疊播放、不播過期指令 |
| FR-AUD-04 | 缺檔或解碼錯誤保留文字圖像 | 顯示可理解提示，不偷偷切成使用者未選語言 |
| FR-OFF-01 | 全部核心資產離線載入 | 首次安裝後未曾連線也可完成主流程 |
| FR-SRC-01 | 顯示資料版本、覆蓋及驗證狀態 | 示意路網與官方來源分別標示 |
| FR-SRC-02 | 所有依賴與素材符合來源允許清單 | 未審查資產不得進正式包 |
| FR-DEL-01 | 完成城市通 WebView 微服務整合 | 從服務入口真機掃碼，普通瀏覽器或獨立 App 不等於完成 |
| FR-LIC-01 | 顯著提供部署版本的原始碼與授權 | repo 匿名可讀、commit／tag 對應、建置資料及第三方通知齊全 |

### 06.6 P1 路線與搜尋擴充

| ID | 必要行為 | 驗收條件 |
| --- | --- | --- |
| FR-MO-01 | 同一可行圖產生去重多路線候選 | 2–5 條或明確只有 1 條，保留方向及無障礙限制 |
| FR-MO-02 | 有完整有效時間模型才啟用 fastest | 缺時間回 UnsupportedOptions，不把最短冒稱最快 |
| FR-MO-03 | 易懂排序有繞路上限及特徵解釋 | 顯示可核對差異，同路線不造兩張卡 |
| FR-SRCH-01 | 七語核准 alias 映射同一概念／真實 POI | 查詞語言不受 UI locale 限制，不重複創建設施 |
| FR-SRCH-02 | 有界 typo matching 只提供建議 | 出口／樓層／節點碼不 fuzzy；不自動開始導航 |
| FR-SRCH-03 | 解析有限意圖並讓使用者確認 | 否定、衝突、未理解條件需澄清，不移除既有限制 |
| FR-SRCH-04 | nearest 以符合需求的 Graph 可達成本排序 | 缺可靠起點要求掃碼，不使用直線距離 |
| FR-SRCH-05 | 搜尋離線且結果具版本與 queryId | 舊結果不可覆蓋新輸入，無查詢上傳及 runtime AI |

## 07 導航狀態與一致性

### 07.1 導航狀態

| 狀態 | 允許事件 | 下一狀態及副作用 |
| --- | --- | --- |
| booting | assetsValid／assetsInvalid | idle／dataError |
| idle | startScan | scanning；請求相機權限 |
| scanning | decoded／cancel／failure | confirmingLocation／原狀態／scanningError |
| confirmingLocation | confirm／rescan | choosingDestination 或重規劃／scanning |
| choosingDestination | selectDestination | planning |
| planning | success／alreadyAtDestination／noRoute／instructionFailure／cancel | routePreview／confirmingArrival／noRoute／guidanceUnavailable／choosingDestination |
| routePreview | start／changeOptions | orienting／planning |
| orienting | confirmFacing | navigating；播當前指令 |
| navigating | next／previous／rescan／changeOptions／finish | navigating／relocating／planning／confirmingArrival |
| relocating | decoded／cancel／failure | confirmingLocation／navigating／保留待重掃提示 |
| confirmingArrival | confirm／cancel | arrived／navigating |
| arrived | newDestination／restart | choosingDestination／idle |
| noRoute | retry／changeDestination／rescan | planning／choosingDestination／scanning |
| guidanceUnavailable | retry／changeDestination／rescan | planning／choosingDestination／scanning；可看路線摘要，不可開始導航 |
| dataError | retry | booting；不保留可執行導航 |

語言、介面模式與靜音是獨立狀態，不因切換語系清除導航。相機權限與音訊狀態不直接決定路線成功或失敗。

### 07.2 Session 欄位

`NavigationSession` 至少保存 `sessionId`、`requestId`、`routeRevision`、`graphVersion`、`confirmedLocation`、`destinationPoiId`、`options`、`activeRoute`、`instructionIndex`、`locale`、`uiMode`、`voiceEnabled`、`arrivalConfirmation`。

`confirmedLocation` 保存 `anchorId`、`nodeId`、`confirmedAt`、`source=qr`；手動展示選點若開放，來源必須為 `demo_manual` 並顯示「示範選點」，不得偽裝為掃碼。`instructionIndex` 表示使用者檢視到哪一步，不能當作感測位置。

### 07.3 事件與原子更新

1. 每次規劃建立新 `requestId`；結果只可套用在相同請求、圖版本與選項。
2. 規劃成功後，一次更新路線、指令列表、地圖路徑與 `routeRevision`，步驟回到 0。
3. 進入重掃立即停止舊語音。成功確認新位置後，舊路線標失效並重算；失敗時不得繼續播放舊路線作為新起點指引。
4. 取消重掃而未確認新位置，回舊路線，顯示上次確認時間並要求使用者手動重播。
5. 改語言只更新呈現與音訊 token，不改 routeRevision；改通行需求必須重新規劃。
6. 網頁進背景停止語音與非必要動畫；相機生命週期由宿主處理。原生掃碼頁覆蓋 WebView 時保留 pending 與 receiver，hidden 不表示取消；真正卸載才移除。回前景不自動播報或推進。
7. 程序被終止後 P0 只恢復語言／模式／靜音，不恢復成正在導航；重新掃碼開始。

同起終點是明確特例：收到 alreadyAtDestination 後直接進 confirmingArrival，跳過 routePreview、orienting、導航開始語音與步驟建立；使用者或有效 QR 確認後才播放抵達句。

### 07.4 並行防護

掃碼成功後鎖住該 scanning session；使用者重新開啟掃碼即為新 session，可再次掃同碼。音訊以 `(sessionId, routeRevision, instructionId, locale, generation)` 識別。新事件遞增 generation；舊載入即使晚完成也不能播放。連按「下一步」在提交前鎖住單一 UI 事件，禁止因重繪重複推進。

## 08 資料封裝與版本

### 08.1 檔案分工

```text
web/
  src/
    main.ts
    navigation/
    bridge/
    map/
    voice/
    i18n/
  public/
    assets/
      manifest.json
      maps/B1.svg
      maps/B2.svg
      data/{floors,nodes,edges,pois,qr_anchors,landmarks,orientation_guides,sources}.json
      navigation/voice_manifest.json
      i18n/{zh-TW,en,vi,id,th,ko,ja}.json
      audio/{locale}/{sentence_id}.mp3
      fonts/{reviewed_font_file}
  dist/
content/
  messages.zh-TW.json
  translations/{locale}.json
  glossary.json
  review_status.json
  voices.lock.json
  provenance.json
integration/townpass/
  README.md
  patches/
```

`content/` 是唯一編輯來源，產生全部 UI、動態 POI、地標與指令的七語 JSON，以及 TypeScript key 型別；網頁不產生 Flutter ARB。`assets/` 路徑是相對於微服務 base URL 的發行資產，不能混成 rootBundle 路徑。舊提案 graph.json 是概念名稱，本版採分檔，由 GraphRepository 組成一份不可變圖。

`dist/` 為建置產物；宿主內嵌時將同一 build package 複製進其明確宣告的資產目錄，保存 hash 與載入 patch，不在本 repo 建第二個 Git root。以上目錄為預計結構，目前尚未建立產品。

### 08.2 Package manifest

以下所有 JSON 範例均為規格示例，不是真實北車座標、測量或審查完成證據。

```json
{
  "schema_version": "1.0.0",
  "package_id": "taipei_maze_demo",
  "site_id": "taipei_main_demo",
  "graph_version": "1.0.0",
  "content_version": "1.0.0",
  "map_version": "1.0.0",
  "voice_version": "1.0.0",
  "coordinate_system": "floor_local_xy",
  "routing_unit": "relative",
  "validation_mode": "synthetic_demo",
  "supported_locales": ["zh-TW", "en", "vi", "id", "th", "ko", "ja"],
  "required_voice_count_per_locale": 24,
  "entry_points": {
    "floors": "assets/data/floors.json",
    "nodes": "assets/data/nodes.json",
    "edges": "assets/data/edges.json",
    "pois": "assets/data/pois.json",
    "anchors": "assets/data/qr_anchors.json",
    "landmarks": "assets/data/landmarks.json",
    "orientation_guides": "assets/data/orientation_guides.json",
    "sources": "assets/data/sources.json",
    "voices": "assets/navigation/voice_manifest.json"
  }
}
```

正式 manifest 另含 `files` 陣列，每項有 `path`、`sha256`、`byte_size`、`source_ids`；hash 不包含 manifest 自己，避免自我參照。路網、底圖與語音分版，但打包時鎖成一個 package，不在導航途中熱更新。

### 08.3 載入驗證

必須檢查 JSON 可解析、schema major 相容、ID 唯一、引用存在、樓層一致、非負有限成本、方向及 connector 正確、座標在 viewBox、地標存在、七語 key 完整、音檔與檔案 hash 正確。拒絕 `NaN`、無限值、重複邊 ID、重複 anchor ID、空標籤與非法相對路徑。

核心路網或地圖無效則停止導航；單一語音損毀可降級文字但對應語音包標不可用，正式包仍不通過 P0 全功能驗收。未知 schema major 不猜測相容。可接受新增非必要欄位，不能忽略已知欄位的錯誤型別。

## 09 路網與定位資料契約

### 09.1 共通規則

- ID 使用 ASCII 小寫字母、數字、底線，長度 1–64，規則 `^[a-z][a-z0-9_]{0,63}$`；舊提案大寫 ID 在匯入時一次轉換並更新引用，runtime 不模糊比對。
- 時間用含時區 ISO 8601；資料檔可標 UTC，介面依臺灣時間顯示。
- 樓層 ID 採 `b1`、`b2`，畫面標籤為 B1／B2；不可將樓層排序當海拔或方向座標。
- 所有 `*_key` 指向七語文字資源；`source_ids` 指向來源紀錄。
- `verification_status` 為 `synthetic`、`desk_checked`、`field_checked`；只能根據實際核對證據設定。
- P0 正式導航要求連續示範路線中的節點、邊及方向指引具符合交付模式的驗證；桌面推估不能寫成現場核對。

### 09.2 Floor

| 欄位 | 型別 | 規則 |
| --- | --- | --- |
| id | string | `b1`／`b2`，唯一 |
| label_key | string | 多語樓層名稱 |
| order | int | 顯示順序，不能用於推斷 connector |
| map_asset | string | 本地 SVG 或審查後點陣圖 |
| view_box | object | x、y、width、height；寬高 > 0 |
| source_ids | string[] | 圖檔與改繪來源 |
| coverage_key | string | 已覆蓋區域文字，不得寫全站 |

每層有自己的座標系：原點左上、x 向右、y 向下。跨層 x/y 不可直接比較距離或轉向。

### 09.3 Node

```json
{
  "id": "b1_n01",
  "floor_id": "b1",
  "x": 120.0,
  "y": 180.0,
  "type": "qr_anchor",
  "label_key": "node_b1_n01",
  "zone_id": "public_demo",
  "landmark_ids": ["lm_elevator_sign"],
  "verification_status": "synthetic",
  "source_ids": ["src_synthetic_fixture"]
}
```

`type` 為 `junction`、`qr_anchor`、`exit`、`facility`、`connector_landing`。POI 與 anchor 透過引用掛到節點，不因 type 相同就自動合併。節點本身沒有導航成本。

### 09.4 Directed Edge

```json
{
  "id": "e_b1_n01_n02",
  "from_node_id": "b1_n01",
  "to_node_id": "b1_n02",
  "type": "walkway",
  "routing_cost": 18.0,
  "distance_m": null,
  "status": "open",
  "step_free": "yes",
  "wheelchair_passable": "yes",
  "zone_id": "public_demo",
  "connector_id": null,
  "geometry": [[120.0, 180.0], [200.0, 180.0]],
  "verification_status": "synthetic",
  "source_ids": ["src_synthetic_fixture"]
}
```

| 欄位 | 規則 |
| --- | --- |
| from_node_id／to_node_id | 必須存在，不能同節點；P0 edge cost 必須 > 0 |
| type | `walkway`、`stairs`、`elevator`、`escalator`、`gate` |
| routing_cost | 有限正數，整個 package 同一尺度，不混用公尺與像素 |
| distance_m | 已量測／校準才可為正數，否則 null；未知不得填 0 |
| status | `open`、`closed`、`unknown`；P0 unknown 視為不可通行 |
| step_free／wheelchair_passable | `yes`、`no`、`unknown`；無障礙兩者均須 yes |
| zone_id | P0 僅 `public_demo`，跨付費區不列入本版 |
| connector_id | 跨樓層必填；同層通常 null |
| geometry | 同層繪圖折線；首尾須對應節點，容差 0.5 地圖單位 |

每筆邊為單向。雙向走道儲存兩筆不同 edge ID；資料建置器可以從 authoring 的雙向宣告產生，runtime 不再有 `bidirectional` 自動反轉，避免電扶梯被錯誤補逆向邊。反向邊的 geometry、入口朝向與地標指引必須反向重建，不能複製左右提示。

跨樓層邊的 geometry 固定為空陣列，不繪製橫跨兩張底圖的線；繪圖使用兩端落點及 connector 圖示。`connector_id` 相同只代表同設備，並不自動建立所有樓層連線。

### 09.5 Connector 與設備資訊

本版 connector 記錄於 `edges.json` 頂層 `connectors`，含 `id`、`type`、`landing_node_ids`、`label_key`、`verification_status`、`status_observed_at`、`source_ids`。每條跨層 edge 的兩端須出現在 connector 的 landing 清單。

電梯可及性至少包括可由公共走道抵達、出入口可通行及樓層連通已核對；不可只因節點標為電梯就認定可供輪椅使用。資料為靜態快照，介面必須顯示「非即時設備狀態」。使用者回報電梯無法使用時，P0 可將該 session 的 connector 設為 unavailable 並重算，不上傳、不宣稱已更新官方資料。

### 09.6 POI 與 Landmark

| 實體 | 必填欄位 | 規則 |
| --- | --- | --- |
| POI | id、node_id、category、name_key、original_signage、enabled、source_ids | category 包含 exit／restroom／elevator；enabled=false 不出現在目的地清單 |
| Landmark | id、node_id、name_key、original_signage、visibility_context、verification_status、source_ids | visibility_context 說明從哪些進入邊能看見；不能從所有方向都假設可見 |

無障礙廁所必須另外有 `accessible_facility=true` 與驗證依據；一般廁所不能只因路徑無階梯就稱無障礙廁所。設施搜尋「能走到」與設施「本身符合無障礙」分開過濾。

### 09.7 QR anchor 與 payload

anchor 包含 `id`、`node_id`、`enabled`、`face_landmark_id`、`departure_edge_ids`、`signage_code`、`verification_status`、`source_ids`。`face_landmark_id` 用來要求使用者面向可辨識地標，不表示掃描相機自動知道手機朝向。

payload 為 UTF-8 JSON，最多 1024 bytes，只接受下列欄位；不得將 payload 當檔案路徑、URI 或程式碼執行。

```json
{
  "type": "taipei_maze_anchor",
  "v": 1,
  "site_id": "taipei_main_demo",
  "graph_major": 1,
  "anchor_id": "qr_b1_a"
}
```

QR 不直接包含 x/y、可及性或導航文字，避免惡意內容覆蓋本地資料。查到本地 anchor 後，單次模式仍需使用者確認位置；已明確啟動的持續掃描模式依第 06.1 節採用有效定位碼，但不自動確認朝向。graph minor 更新可相容既有 anchor；major 不符拒絕並提示版本不支援。原型 QR 不含數位簽章，無法防止合法碼被搬到錯誤位置；正式部署須增加管理、巡檢與防替換設計，本次不得宣稱防偽。

### 09.8 人工朝向指引 OrientationGuide

`orientation_guides.json` 是人工核對方向的唯一來源，分為 `anchor_departure` 與 `connector_exit`。同一 anchor 走不同首條 edge，或同一電梯落點轉向不同出口，必須有各自明確對應，不能只靠「這裡有一個地標」推測左右。

| 欄位 | 型別及規則 |
| --- | --- |
| id | 唯一 string ID |
| context_type | anchor_departure／connector_exit |
| anchor_id | anchor_departure 必填；connector_exit 為 null |
| incoming_connector_id | connector_exit 必填；anchor_departure 為 null |
| node_id | 當前出發或到層 landing node |
| outgoing_edge_id | 必須存在，且 from_node_id=node_id |
| face_landmark_id | 在該出發／出口位置可見的地標，必須存在 |
| text_key／params | 七語朝向及出發指示，變數需符合 catalog |
| icon_id／voice_sentence_ids | 與動作語意一致，不用另一方向的音檔 |
| verification_status／source_ids | 依部署模式接受的人工核對證據 |

複合鍵 `(context_type, anchor_id, incoming_connector_id, node_id, outgoing_edge_id)` 唯一。anchor_departure 的 node 必須等於 anchor 節點，outgoing edge 必須在該 anchor 的 departure_edge_ids；connector_exit 的 node 必須是該設備 landing。InstructionBuilder 依確切上下文查詢，缺失或互相矛盾返回 `OrientationUnavailable`，可顯示路線摘要但禁止啟動該導航，不用一般角度算法補猜。

### 09.9 SourceRecord 與距離

來源至少保存 `id`、`title`、`publisher`、`url`、`retrieved_at`、`source_updated_at`（可 null）、`license_reference`、`redistribution_status`、`verification_method`、`reviewer`。來源網站有公開檔不代表圖檔可任意重製。

`routing_unit=relative`：所有 routing_cost 由統一規則建立，僅能稱「圖模型中的最短相對成本路線」，畫面顯示「距離未校準」。`routing_unit=meters`：所有邊具有可靠 distance_m，routing_cost 取 distance_m，顯示公尺。跨層設備移動長度亦需合理量測依據，沒有依據不得混進 meter package。

P0 不顯示步行時間估計。未建立可驗證時間模型前，不提供「最快」按鈕，以「最短」或「較少轉彎」準確表達。

## 10 路徑演算法與無障礙

### 10.1 RouteOptions

`mobilityProfile` 為 `standard`／`stepFree`；P0 preference 僅 shortest，P1 可啟用 easyToUnderstand，以及有完整時間模型才可用的 fastest。`unavailableConnectorIds` 為本次 session 使用者回報不可用設備；`allowedZoneIds` 在 P0 固定僅公共示範區。P1 excludedEdgeTypes 只能追加禁止類型，不可放寬 mobilityProfile。

UI 的「無障礙」對應 `stepFree`，文字說明是「依已核對資料避開樓梯與電扶梯，優先可及電梯」，不是對所有障別或即時狀態保證。

### 10.2 過濾順序

1. 驗證起終點存在且 enabled，圖版本可用。
2. 排除 status 非 open、未符合部署驗證模式的邊。
3. 排除不允許區域、方向不存在、session 不可用 connector，以及 P1 excludedEdgeTypes 中的邊。
4. `stepFree` 額外排除 stairs、escalator，並要求 step_free=yes 且 wheelchair_passable=yes；任何 unknown 不得視為 yes。
5. 在剩餘有向圖上計算最短路徑；無候選即返回 NoRoute，不放寬上述條件。

`synthetic_demo` 只允許清楚標示的模擬圖展示；實際場站導航採 `field_verified_demo`，僅接納 field_checked 邊。驗證模式不可由使用者隨意切成較寬鬆以取得路線。

### 10.3 Dijkstra 契約

- 使用 adjacency list 與 min-priority queue，P0 不要求 A*；避免沒有可信啟發式時誤用樓層像素距離。
- 累積成本以 double；比較容差工程預設 `epsilon=1e-9`。同成本時選完整 edge ID 序列字典序較小者，使結果可重現。
- 完整路徑不能含循環；結束時驗證每個相鄰 node 對應輸出 edge、起終點正確、所有硬限制仍成立。
- source=destination 返回成功的單節點、零 edge 路線，之後進抵達確認。
- 複雜度目標為 `O((V+E) log V)`；小圖不能成為省略方向檢查的理由。
- 發生 schema／數值錯誤回 InvalidGraph，不包成 NoRoute；兩者使用者提示不同。

### 10.4 RouteResult 與 NavigationPlan

RoutePlanner 成功回傳 `RouteResult.success(route: Route)`；Route 欄位為 `routeId`、`requestId`、`graphVersion`、`routeRevision`、`nodeIds`、`edgeIds`、`totalRoutingCost`、`totalDistanceM`（任一邊未知則 null）、`floorSequence`、`connectorIds`、`optionsSnapshot`。Route 是不可變的純路徑結果，**不含 instructions**。

失敗類型：`UnknownStart`、`UnknownDestination`、`InvalidGraph`、`NoRoute`、`UnsupportedOptions`、`Cancelled`。NoRoute 含經過哪些過濾類別，不顯示未經證實的「電梯壞掉」原因；只知道不連通時說「目前資料無法找到符合需求的路線」。

Controller 收到非零邊 Route 後呼叫 InstructionBuilder；兩者均成功才建立不可變 `NavigationPlan(route, instructions, orientationContext)`，一次發布地圖、指令與新 revision。生成失敗回 `InstructionBuildResult.failure`，型別包含 `OrientationUnavailable`、`MissingLandmark`、`MissingMessage`、`InvalidGeometry`；進 guidanceUnavailable，只顯示已算出的路線摘要，禁止開始、停止語音。零邊 Route 走 alreadyAtDestination 特例，不要求方向指引。

### 10.5 路線變更

切換 mobilityProfile 必須以新 options 重算；保留最後掃碼位置作起點，明確要求使用者確認仍在該點。若使用者已走動，先重掃再採用新路線。不能用已走到的 instructionIndex 反推實際位置。

## 11 方向與指令生成

### 11.1 原則

先算路徑，再生成指令；語言及音檔不參與圖拓樸或可通行性。每條路線的指令列表是不可變資料，所有呈現端共用。

`Instruction` 必備：`id`、`routeRevision`、`sequence`、`type`、`fromNodeId`、`toNodeId`、`floorId`、`targetFloorId`（跨層用）、`edgeIds`、`textKey`、`params`、`iconId`、`voiceSentenceIds`、`landmarkId`（可 null）、`requiresOrientation`、`confirmationType`。

`type` 至少包含 orient／straight／turnLeft／turnRight／turnBack／enterElevator／changeFloor／exitConnector／scanCheckpoint／arrival。`confirmationType` 為 manual／qrOrManual；此原型沒有 sensorAutomatic。

### 11.2 起始朝向

- QR 只決定節點，不提供使用者朝向。初始畫面要求「請面向〔現場標示名稱〕」，顯示經核對的參考圖示／文字。
- 對應出發 edge 必須有可辨識地標及人工核對的起始指令；若當前 anchor 的參考方向無法套用該路線，顯示路線圖與「請重新確認方向」，不能猜左／右。
- 沒有足夠方向參照的 anchor 不得作已驗證 Demo 路線起點，資料驗證須列出缺口。
- 不使用手機指南針結果作 P0 確認，也不以掃描相機朝向充當使用者行進朝向。

### 11.3 同樓層轉向

同層使用前一折線末段向量與下一折線首段向量。座標 y 向下；`delta=normalize(atan2(outY,outX)-atan2(inY,inX))`，正規化至 `(-180,180]` 度。

工程預設：絕對值 < 30 度為 straight；30–150 度正值為 turnRight、負值為 turnLeft；絕對值 >150 度為 turnBack。恰好 30 度歸轉彎，恰好 150 度仍為轉彎。零向量、跨層或幾何不足不使用角度分類，要求人工指令。

原點或底圖變換不得左右鏡射；需有 east→south=右、east→north=左的回歸案例。圖面推算結果只是草稿，Demo 路線指引須按實際動線核對。

### 11.4 合併與樓層指令

連續直行可合併，但不得跨過岔路、QR checkpoint、重要地標、connector、方向變更或目的地。每個跨層段至少呈現「前往設備」「搭乘至目標樓層」「到層後確認方向」；電梯出口方向需有落點參照，不沿用前一層向量。

指令中有距離時，只使用整段已知 distance_m 的總和；否則省略距離，改以地標說明。語音 P0 以固定短句表達動作，畫面補充動態地標／樓層；兩者必須語意一致，不宣稱逐字相同。

### 11.5 抵達

抵達判斷只接受：掃到 node 與目的地 node 相同的有效 anchor，或使用者在最後一步按「我已抵達」。紀錄 confirmationSource=qr／manual，畫面不宣稱系統感測到抵達。尚未確認時顯示「請確認是否已到達」，不自動播已抵達。

## 12 地圖繪製與樓層

### 12.1 疊圖

底圖與路網使用相同 floor-local viewBox。縮放採等比 contain，保留 offset；節點、折線及 hit test 共用單一轉換：`screen = (local - viewBoxOrigin) × scale + contentOffset`。反向點擊用其逆變換，不能分別用畫面寬高各自縮放。

### 12.2 呈現

- 地圖同時顯示樓層標籤、起點、終點、路徑、connector 與圖例，不只靠顏色分辨。
- 「上次確認位置」為實心標記並帶時間；「目前檢視步驟」用不同樣式，不畫成移動定位藍點。
- 當前樓層只畫該層路段；跨樓層位置用電梯／樓梯圖示及前往哪層文字。
- 手動切圖不改 `confirmedLocation`、instructionIndex 或 routeRevision。
- 導航步驟進入另一層時可切換檢視樓層，但需標「指引目標樓層」，直到使用者確認或掃碼。
- 縮放與平移有重設按鈕；簡易模式預設固定到當前步驟範圍，完整圖可展開。
- 背景圖載入失敗時不顯示浮空路線；本次 P0 不能在沒有可信地圖的狀態下繼續導航。

### 12.3 地圖素材

官方 PDF 與設施資料是參考，不直接等於 Graph。未確認圖像再散布權利前，採團隊自行繪製並清楚標「示意」的局部幾何圖；不能因重新描繪就自動認定已消除原圖權利問題。若取得可使用來源，記錄來源、裁切、改繪方式及授權。

## 13 七語介面規格

### 13.1 語系與名稱

| 排列 | 語言 | App locale／檔名 | 顯示原文 | 翻譯服務代碼 | TTS locale |
| --- | --- | --- | --- | --- | --- |
| 1 | 繁體中文（臺灣） | `zh-TW` | 繁體中文 | `zh-Hant`，作為來源 | `zh-TW` |
| 2 | 英文 | `en` | English | `en` | `en-US` |
| 3 | 越南文 | `vi` | Tiếng Việt | `vi` | `vi-VN` |
| 4 | 印尼文 | `id` | Bahasa Indonesia | `id` | `id-ID` |
| 5 | 泰文 | `th` | ไทย | `th` | `th-TH` |
| 6 | 韓文 | `ko` | 한국어 | `ko` | `ko-KR` |
| 7 | 日文 | `ja` | 日本語 | `ja` | `ja-JP` |

排列是介面順序，不是可延後其中四語的交付分級。裝置語系匹配 `zh-Hant`／`zh-TW` 到繁中；其他中文區域可提供繁中但不生成簡中資源。`in`（舊式印尼文代碼）若由平台傳入，只在邊界正規化為 `id`，內部不得另建語言包。

### 13.2 文案來源與 key

`content/messages.zh-TW.json` 每項記錄穩定 key、中文原文、畫面／語音用途、情境、參數名稱及可否語音。翻譯只改 value，不改 key／ID／URL／`B1`／`B2`／QR 碼／placeholder。

必備 key 群組：

| 群組 | 必須涵蓋 |
| --- | --- |
| common | 開始、下一步、上一步、確認、取消、重試、返回、關閉 |
| home | 產品名、掃碼開始、語言、模式、示範範圍 |
| scan | 相機說明、拒絕權限、無相機、錯誤 QR、不支援版本、重掃 |
| location | 上次確認位置、時間、樓層、地標、確認位置、示範選點 |
| destination | 目的地、出口、廁所、電梯、無可用目的地 |
| route | 一般、無障礙、開始、規劃中、無路線、距離未校準、資料非即時 |
| guidance | 全部 Instruction types、進度、我迷路了、確認朝向、到層確認、抵達確認 |
| audio | 播放、暫停、重播、靜音、缺檔、無法播放、語速（P1） |
| settings | 標準／簡易、字級、高對比、來源、版本、範圍與驗證說明 |
| error | 資料失效、圖損毀、找不到節點、重規劃失敗、恢復操作 |
| dynamic | 每個已啟用 POI、節點標籤與地標的七語名稱 |

固定 UI 文字至少覆蓋上述需求，實際 key 數以凍結 catalog 為準，不把「24 句語音」誤當成整個 App 只有 24 條翻譯。

### 13.3 微服務網頁實作

單一中文主 catalog 產生七語 JSON 與 TypeScript key 型別，UI、POI、指令共用 LocalizationRepository。完整句子用命名參數與每語完整模板，不用共通字串片段硬串語序；不使用 runtime AI 或 eval。動態資料透過 textContent／安全文字渲染，不能把翻譯當 HTML 任意插入。

```json
{
  "locale": "en",
  "messages": {
    "confirm_location": "Confirm your location",
    "go_to_floor": "Take the elevator to {floor}"
  },
  "parameters": {
    "go_to_floor": {"floor": "string"}
  }
}
```

所有語系 placeholder 集合與型別必須相同；不能翻譯 key、B1／B2、出口碼或 URL。切換 locale 時更新文件 lang；繁中對應 zh-Hant-TW，其他語言依矩陣，並保持站內原文對照。宿主 Flutter 的國際化屬其自身設定，不代表我們的網頁需用 ARB。

### 13.4 缺譯與字型

開發版缺 key 顯示明顯診斷並在 CI 失敗；正式版先顯示同語系已核准通用短句，無可用短句時顯示英文備援並標明備援語言，不能顯示空白。此容錯不代表七語已通過驗收。

字型須本地打包並審查來源／再散布權利，覆蓋繁中、拉丁及越南附加符號、泰文、韓文、日文。候選為可追溯的 Google Noto 字型官方來源，未審查前不列為 approved。不能用執行期 Google Fonts 網路下載滿足離線驗收。

### 13.5 語言品質

左右、上下、樓層、出口、電梯／電扶梯與否定句屬關鍵語意。必須逐條對照原文，至少由具該語言能力者確認導航與安全關鍵詞。無適任校對者時可先機器翻譯測試版，reviewStatus 保持 machine_draft，不能宣稱校對完成。反向翻譯可找疑點，不能取代該語言校對。

## 14 快速翻譯與語音製作流程

### 14.1 推薦方案

**最快可維護的方法是共用 key 與固定句庫，批次生成七語文字及音檔，再全部打包；不是做七份介面，也不是讓手機即時呼叫翻譯或語音 API。**

第一候選為開發階段使用 Microsoft 全球 Azure Translator 產生六種外語草稿、Azure Speech 生成七語音檔；實際採用前須完成第 16 節來源、區域、付費與輸出再散布審查。此方案不表示本次已建立帳號、購買額度、呼叫服務或產生音檔。

Azure Translator 官方方法支援同一請求使用多個 `to` 參數；批次工具仍要按目前服務配額切分，不寫死無上限。Speech 可採 SDK 逐句合成，或非同步 Batch Synthesis 建立工作後下載結果；168 個短音檔以可斷點重跑的逐句工作佇列較容易對應 key。這些操作都只在開發環境執行。[Translator 方法](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate)、[Speech Batch Synthesis](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-synthesis)。

### 14.2 方案比較

| 方法 | 速度與優點 | 限制 | 本案決策 |
| --- | --- | --- | --- |
| 已審查的全球 Azure 翻譯＋Speech | 一組 catalog 批次產出七語，便於版本控制 | 有帳號、費用、區域與輸出授權審查 | 首選候選，審查通過才使用 |
| 具語言能力者翻譯＋真人逐句錄音 | 不需外部模型，可明確取得聲音與再散布授權 | 需七語人力與收音品質控管 | 服務來源或授權不符時的可靠替代 |
| 其他非中國供應商的翻譯／TTS | 可作替代 | 每項重新審查，不自動納入允許清單 | 不在 P0 期間同時混用多家 |
| 開源多語 TTS 自架 | 可離線建置 | 模型權重、訓練來源、授權、算力及語種能力未必清楚 | 不作快速交付預設 |
| 裝置內建 TTS／瀏覽器 speechSynthesis | 程式接入快 | 裝置供應商與語音包來源、可用語種、離線能力不一致 | 不採用作 P0 必要語音 |
| 免費匿名翻譯／TTS 網站、非官方代理 | 看似快 | 來源、資料流向及輸出權利不可稽核 | 禁止 |

七語 UI 只需一套元件；固定文案與音檔可自動批次，真正容易耗時的是語意校對與路網核對。不得以批次完成等同七語品質完成。

### 14.3 可執行製作步驟

1. **凍結中文原稿。** 完成畫面 key、24 句語音、POI 及地標原文。每句有情境、變數、可否播報與安全重要性。
2. **建立詞彙表。** 鎖定臺北車站、出口、電梯、電扶梯、無障礙、B1／B2、左／右等詞；站內原文保留，不機器改寫出口編號。
3. **設定來源允許清單。** 記錄供應商、實際服務、非中國部署區域、endpoint、服務條款版本、輸出使用／再散布證據、審查人及日期。未完成時只製作本地資料架構，不呼叫未知服務。
4. **產生六語翻譯草稿。** 明確指定 `from=zh-Hant`，目標 `en,vi,id,th,ko,ja`；以輸入索引映射原 key，拒絕缺項、語系重複、placeholder 遺失及 ID 變動。
5. **逐語校對。** 用同一確認表檢查方向、樓層、否定、設施差異與地標。狀態依序為 machine_draft → language_reviewed → audio_reviewed → approved。
6. **鎖定語音。** 從已核准區域的 voices list 查詢實際可用名稱；每語一個固定 voice，不自動改用另一模型或中國語音。
7. **批次合成 168 個音檔。** 工作鍵為 locale＋sentenceId＋文字 hash＋voice＋格式。只重做變動項目；短句獨立音檔，不生成一整段再猜切點。
8. **驗證音訊。** 檢查可解碼、非空、無截斷、音量及語速一致；每句聽檢並比對語系與左右方向。輸出 mp3 與 manifest。
9. **產出 UI 資源。** 同一 catalog 產生七語 JSON 與 TypeScript key 型別，驗證全部介面及動態標籤。拒絕任何未核准譯文進正式包。
10. **離線真機驗收。** 關網後冷啟動，逐語操作、播放、切語言、重掃；保存資產版本及測試結果。

### 14.4 建議語音設定

下列是官方語言支援頁中的候選聲音，僅作建置時選型起點，不保證在指定帳號／區域均可用。建置前查 voices list 並寫入 `voices.lock.json`，禁止無聲替換。若候選 unavailable，停止該語工作，由人工核准新候選。[語言與聲音支援](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)、[區域聲音查詢與 TTS REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)。

| App locale | 候選 voice | 選型條件 |
| --- | --- | --- |
| zh-TW | `zh-TW-HsiaoChenNeural` | 臺灣繁體中文，禁止自動改為 zh-CN 聲音 |
| en | `en-US-JennyNeural` | 英文，優先清楚穩定，不依賴預覽模型 |
| vi | `vi-VN-HoaiMyNeural` | 越南文 |
| id | `id-ID-GadisNeural` | 印尼文，不得用印地文代替 |
| th | 由已核准區域 API 選定 th-TH 聲音 | 需實際查詢與鎖版，不憑過時清單寫死 |
| ko | `ko-KR-SunHiNeural` | 韓文 |
| ja | `ja-JP-NanamiNeural` | 日文 |

語音名稱、locale、供應商與非中國來源審查是不同層次；光是 voice 名含 zh-TW 並不能證明所有上游符合使用者要求。若無足夠證據，該項維持未核准，採已取得權利的真人錄音。

### 14.5 工具契約

以下是未來應建立的工具及指令介面，**本次僅寫規格，這些程式尚未建立**。

| 工具 | 輸入 | 輸出與失敗條件 |
| --- | --- | --- |
| `tools/content/validate_catalog.py` | 主 catalog、七語翻譯、glossary | JSON 報告；缺 key／變數／審查狀態則 exit 1 |
| `tools/content/translate_batch.py` | 已審查 provider config、中文 catalog | 六語草稿，不覆寫人工 reviewed 文案 |
| `tools/content/build_voice_jobs.py` | approved 句庫、voices.lock | 168 個 idempotent 工作及預估字數 |
| `tools/content/synthesize_audio.py` | 核准工作、憑證環境變數 | 音檔、來源 metadata、失敗工作清單 |
| `tools/content/build_localizations.py` | 同一版 reviewed catalog | 七語 assets JSON 與 TypeScript key 型別 |
| `tools/content/validate_audio.py` | manifest、音檔 | hash、解碼、時長、缺失及審查報告 |
| `tools/data/validate_package.ts` | package manifest | 路網、來源、語系與資產一致性報告 |

建置工具憑證只從環境或本機密鑰儲存讀取，不出現在命令範例、stdout、manifest、App assets 或 Git。HTTP timeout 預設 30 秒，最多 3 次 retry；429／暫時 5xx 用退避並尊重 Retry-After，401／403 不反覆重試。SSML 特殊字元須 escape，文字只能進文字節點，不能當任意 XML 或 shell 執行。

翻譯與合成前顯示工作數及預估字元量，費用依當時方案確認；本規格不承諾免費額度。批次中斷需可續跑，不能重做所有已通過 hash 的音檔而重複計費。供應商輸出只存媒體與必要 metadata，不保存憑證／簽名下載 URL。

### 14.6 時間配置

七語工作與 UI／路網平行：前 1 小時凍結短句及來源方案、1–3 小時批次草稿與 UI 生成、3–6 小時校對及音檔生成、6–10 小時真機與語音聽檢。這是工程估時，取決於帳號、配額及校對人力；不可將估時寫成實際完成紀錄。

## 15 離線語音與播放契約

### 15.1 24 句核心句庫

| sentence_id | 繁體中文原稿 | 使用時機 |
| --- | --- | --- |
| nav_start | 導航開始，請依照指示前進。 | 使用者開始導航 |
| go_straight | 請直走。 | 直行指令 |
| turn_left | 請左轉。 | 已確認朝向的左轉 |
| turn_right | 請右轉。 | 已確認朝向的右轉 |
| turn_back | 請確認方向，再依畫面指示回轉。 | 安全可回轉路段 |
| take_elevator | 請搭乘電梯，並確認畫面上的目標樓層。 | 電梯入口 |
| go_upstairs | 請依指示上樓。 | 一般模式樓梯 |
| go_downstairs | 請依指示下樓。 | 一般模式樓梯 |
| take_escalator_up | 請搭乘上行電扶梯。 | 一般模式且方向已核對 |
| take_escalator_down | 請搭乘下行電扶梯。 | 一般模式且方向已核對 |
| exit_elevator | 請離開電梯，再確認下一步方向。 | 到層確認後 |
| scan_qr | 請掃描附近的 QR Code，確認目前位置。 | 重新定位 |
| location_confirmed | 已確認您掃描的位置。 | 使用者確認 anchor |
| route_updated | 已重新規劃路線，請確認新的指引。 | 新路線完整套用後 |
| destination_arrived | 您已確認抵達目的地。 | 使用者或有效 QR 抵達確認後 |
| orientation_check | 請先面向畫面中的地標，再開始前進。 | 初始朝向確認 |
| floor_b1 | 目標樓層是地下一樓。 | B1 目標層，按語言序列播放 |
| floor_b2 | 目標樓層是地下二樓。 | B2 目標層，按語言序列播放 |
| accessible_selected | 已選擇無障礙需求，將依現有資料規劃路線。 | 選項確認，不表示規劃成功 |
| no_route | 目前找不到符合需求的路線，請重新選擇或求助。 | NoRoute |
| scan_failed | 無法辨識這個定位點，請重新掃描。 | 無效碼 |
| audio_unavailable | 語音暫時無法播放，請查看文字與圖示。 | 音訊診斷；不能依賴這段一定播得出來 |
| confirm_next | 完成這一步後，請按下一步。 | 手動步驟說明 |
| route_cancelled | 導航已結束。 | 明確結束導航 |

每句七語各一檔，共 168 檔；不得將 en 複製進其他語系資料夾來湊數。音檔與文字需有不同 hash／來源紀錄；相同語意短句不必每個 POI 重做一份。

### 15.2 動態內容

P0 不為任意輸入即時造句。動態地標、出口與距離顯示在已翻譯文字中，語音先播已核准的動作短句；跨層再依語言模板播 `floor_b1`／`floor_b2`。每語可設定完整句序列，禁止假設七語語序都能直接串「直走＋30 公尺＋右轉」。

完整常用導航句若需要更自然，可預生成額外音檔，新增 stable sentence_id 並納入翻譯及審查，不覆寫既有 ID 成不同意思。畫面必須呈現音訊實際播的動作與當前目的層；音訊不能說 B1 而畫面是 B2。

### 15.3 voice manifest

```json
{
  "schema_version": "1.0.0",
  "voice_version": "1.0.0",
  "entries": [
    {
      "locale": "en",
      "sentence_id": "turn_left",
      "asset_path": "assets/audio/en/turn_left.mp3",
      "text": "Turn left.",
      "provider_id": "pending_review",
      "voice_id": "pending_selection",
      "duration_ms": 1200,
      "sample_rate_hz": 24000,
      "channels": 1,
      "review_status": "machine_draft",
      "provenance_id": "audio_en_turn_left"
    }
  ]
}
```

正式 entries 另有有效 sha256、text_sha256、license_reference 與 reviewer；上例 pending 值不能通過 release gate。音檔工程預設 MP3、24 kHz、mono、48 kbps；若供應商或目標平台不支援，先轉換並重跑解碼測試，不只改副檔名。單句目標 0.3–12 秒，超過需人工確認；不可把靜音長短判斷當作語言正確性驗證。

### 15.4 音訊狀態機

`idle → loading → playing ↔ paused → completed`；任何狀態可 stop 到 idle，載入或播放失敗進 error。UI 顯示的播放狀態取播放器真實 callback，不按下按鈕就假定播放成功。

| 事件 | 行為 |
| --- | --- |
| 新導航步驟 | stop 舊音訊，核對 token，載入並播放新序列 |
| 重播 | 停止並從目前 instruction 的序列開頭播放 |
| 暫停／繼續 | 保留同指令 position；指令已改則不續播舊內容 |
| 換語言 | 停止舊音訊，更新 locale，使用當前指令的新語系重新播放；靜音時不播 |
| 我迷路了／重新規劃 | 立即中止；成功後只播新版本 |
| App 背景／來電中斷 | 暫停；回前景由使用者確認後播放 |
| 缺檔／解碼錯誤 | 停止該句，顯示同語系文字提示，繼續可操作導航 |
| 連按重播 | latest-wins，一次只允許一個音訊來源 |

P0 音量遵從系統與使用者靜音，不強制最大音量、不要求麥克風權限、不背景自動播報。Web 若被 autoplay 擋住，顯示「點擊播放」並讓使用者觸發，不循環重試。

## 16 非中國來源與授權門檻

### 16.1 使用者要求的執行原則

此限制適用於本案新增的程式依賴、模型及權重、翻譯／語音服務、聲音包、託管／CDN、字型、地圖素材與產生資源。不得使用中國廠牌或其提供／代管的模型與服務，也不得以第三方代理、重新命名或西方公司的 wrapper 包裝後繞過來源要求。

排除來源不明的套件、權重與聲音包；不能因「開源」「免費」「本地執行」「在 GitHub／pub.dev」就推定合規。開源授權與供應商來源須分開檢查。中國來源模型經量化、轉換或鏡像下載後，來源仍未改變。

本文件不聲稱能證明所有商用模型的每筆訓練資料或全球硬體零件都與中國毫無關聯；若要求範圍涉及無法取得證據的上游，維持未核准並記錄疑義，不以品牌國籍替代證明。嚴格來源要求下，真人翻譯／錄音仍須具可稽核權利與來源資料。

### 16.2 選用與審查

| 層次 | 必查項目 | 放行證據 |
| --- | --- | --- |
| 供應商 | 法律實體、營運單位、實際產品提供者 | 官方公司／產品資料及審查紀錄 |
| API／託管 | 實際 endpoint、部署與資料處理區域、代理及 CDN | 官方區域說明、資源設定與網路清單；非中國營運端點 |
| 模型／語音 | 模型名稱、版本、原始提供者、權重來源、衍生來源 | 模型卡／產品文件／voice list，無未審查替換 |
| 程式依賴 | 套件 publisher、官方 repo、直接與遞迴依賴、授權 | lockfile、dependency report、來源與審查狀態 |
| 素材 | 作者／提供者、原始 URL、修改及生成方式 | 素材授權、再散布及製作紀錄 |
| 最終輸出 | 是否能公開 repo、放進 App、移交政府與再散布 | 條款或權利人明確許可，不以「可商用」概括所有權利 |

若採 Azure，僅可使用經審查的 Microsoft 全球服務與非中國部署，不使用中國營運雲、21Vianet 環境或中國區域 endpoint。全球品牌不代表每個區域都合規；審查未完成則不呼叫。不得以支援 zh-TW 為理由選用 zh-CN 模型替代。

### 16.3 provenance 最低欄位

每項資源：`resource_id`、`resource_type`、`supplier`、`operator`、`origin_reference`、`version`、`download_url`（不得含 token）、`sha256`、`deployment_region`（無服務則 null）、`license_reference`、`redistribution_evidence`、`china_origin_review`、`reviewer`、`reviewed_at`、`status`。

status 僅有 proposed／approved／rejected／unverified；**只有 approved 可進 release package**。本 SPEC 的 Microsoft、宿主套件、前端工具及字型均是選型候選，不代表已完成整個依賴樹審查。審查負責人依證據簽認，不能由工具偵測「沒有 .cn 網址」自動變成 approved。

### 16.4 自動門檻與人工門檻

CI 應列出 lockfile、assets、endpoint、CDN、模型與授權清單，對照允許清單；發現未知來源、未鎖版、未審查新依賴或被禁止域名就失敗。這是查漏工具，不是完整來源保證。人工核對營運者、模型繼承及輸出權利才可放行。

微服務 runtime 不需要任何翻譯／TTS／LLM 網路連線；測試以網路紀錄與斷網證明，不單靠搜尋程式字串。正式掃碼使用宿主 qr_code_scan，不在網頁新增掃碼引擎；需審查宿主實際 mobile_scanner 與 bundled／unbundled 資源，避免首次掃碼還要下載。若另做瀏覽器相機 fallback，才另行審查並封裝其 library／WASM；不可默默引入 CDN。[mobile_scanner 官方說明](https://pub.dev/packages/mobile_scanner)。

### 16.5 競賽開源與建置工具的界線

不得把 Azure 商用服務 SDK、API key 或執行期合成依賴帶入參賽 App。開發期產生固定內容是否可採該商用製作工具、其輸出是否能依競賽要求再散布，仍須核對主辦及適用條款。雲端生成內容可用的原則不等於所有 TTS 輸出自動具有 AGPL 授權。

程式碼授權、自製資料與聲音權利、第三方素材各自列明，不把所有檔案一律改標 AGPL。若素材權利不符，改用已取得同意的自製圖、人工翻譯及真人錄音；不能以縮小聲明文字取代必要授權。

## 17 架構與模組介面

### 17.1 模組責任

| 模組 | 責任 | 不應負責 |
| --- | --- | --- |
| AssetRepository | package 載入、hash、schema、版本與引用驗證 | UI 導航狀態 |
| GraphRepository | 提供不可變 GraphSnapshot 與 POI／anchor 查詢 | 直接操控相機或語音 |
| QrDecoder | payload 檢查、版本及 anchor lookup | 開 URL、改任意系統狀態 |
| RoutePlanner | 硬限制、有向 Dijkstra、可重現 RouteResult | 文案翻譯與音檔 |
| InstructionBuilder | route→指令、朝向及地標判斷 | 創造不存在路段 |
| NavigationController | 狀態機、revision、事件與原子更新 | 平台播放器實作 |
| LocalizationRepository | typed UI 文案與動態 catalog | runtime 遠端翻譯 |
| VoiceService | 指令音檔解析、token、中止與播放狀態 | 路線推進及位置推測 |
| MapView | 同層底圖、變換與路徑呈現 | 自行重算另一條路 |
| PreferencesStore | 本機語言、模式與靜音 | 保存個資、相機圖或自動恢復定位 |
| CandidateRoutePlanner／RouteRanker（P1） | 同可行圖候選、時間門檻及可解釋排序 | 放寬硬限制或聲稱全圖認知最優 |
| DictionaryRepository／DestinationSearch（P1） | 核准七語 alias、有限意圖、有界 fuzzy 及可達排名 | runtime AI、上傳查詢或猜出口編號 |

### 17.2 核心介面

以下是供實作對齊的語意介面，型別及測試需按此契約建立；本次不建立產品程式碼。

```text
AssetRepository.loadPackage() -> Promise<PackageLoadResult>
GraphRepository.snapshot() -> GraphSnapshot
QrDecoder.decode(rawText, graphSnapshot) -> QrDecodeResult
RoutePlanner.plan(RouteRequest, GraphSnapshot) -> RouteResult
InstructionBuilder.build(Route, GraphSnapshot, OrientationContext) -> InstructionBuildResult
NavigationController.dispatch(NavigationEvent) -> void
LocalizationRepository.message(key, locale, params) -> LocalizedMessage
VoiceService.play(VoiceRequest) -> Promise<PlaybackOutcome>
VoiceService.pause() / resume() / stop() -> Promise<void>
PreferencesStore.load() -> Promise<UserPreferences>
PreferencesStore.save(UserPreferences) -> Promise<void>
```

`RouteRequest`＝requestId、routeRevision、startNodeId、destinationPoiId、options、graphVersion；routeRevision 由 Controller 預先保留，只在整份 NavigationPlan 成功時發布。`OrientationContext`＝已確認的 startAnchorId 與 startNodeId；後續 connector exit 上下文從 Route 的設備及到層 edge 推得。示範手動選點也須指定具可用 OrientationGuide 的 anchor，不提供任意座標作起點。`VoiceRequest`＝sessionId、routeRevision、instructionId、locale、generation、sentenceIds。各 Result 採明確成功／失敗型別，不用 null 同時代表「未載入」「不存在」「無路徑」。

路網演算法及指令生成為純 TypeScript，不 import DOM、宿主 bridge 或播放器；以同一 fixture 驗證。平台能力採 adapter，不能讓普通瀏覽器與城市通各自有不同通行規則。

### 17.3 建議原始碼位置

```text
web/src/main.ts
web/src/navigation/domain/{graph,route,instruction,route-options}.ts
web/src/navigation/{route-planner,instruction-builder,navigation-controller}.ts
web/src/data/{asset-repository,graph-repository}.ts
web/src/bridge/{townpass-bridge,qr-adapter,mock-bridge}.ts
web/src/views/{home,destinations,route-preview,guidance,arrival}.ts
web/src/map/{floor-map,coordinate-transform}.ts
web/src/voice/{voice-service,html-audio-adapter}.ts
web/src/settings/{preferences-store,settings-view}.ts
web/src/i18n/
web/tests/fixtures/
web/tests/{routing,instructions,qr,voice,localization,state,map}/
web/tests/e2e/
integration/townpass/{README.md,patches/}
tools/content/
tools/data/
docs/acceptance/
```

檔名可細分但責任不可散在畫面。掃碼 QrDecoder 負責本案 payload，TownPassBridge 負責 string/null 原生結果及單一在途／逾時清空。資料載入必須相對 base URL，支援 HTTPS 與經測試的本地 bundle。沒有必要引入後端資料庫、模型伺服器或獨立 Flutter 導航頁。

## 18 例外處理與恢復

| 錯誤碼 | 觸發 | 使用者可見行為 | 恢復與資料處理 |
| --- | --- | --- | --- |
| E-DATA-01 | 核心資料解析、schema 或 hash 失敗 | 顯示資料無法使用及重試 | 不開始導航；不默默載入不相容舊檔 |
| E-QR-01 | 非本專案碼／超長／格式錯誤 | 「這不是支援的定位碼」 | 停該次解析，可重掃 |
| E-QR-02 | anchor 不存在、停用或版本不符 | 「定位點或版本不支援」 | 不接受 QR 自帶座標 |
| E-CAM-01 | 無權限／相機不可用 | 權限說明、取消、依系統開設定 | 保留既有路線，未產生新定位 |
| E-RT-01 | 無可行路徑 | 明確說找不到符合需求路線 | 重選／重掃／求助，不放寬需求 |
| E-RT-02 | 新位置有效但重算失敗 | 顯示新位置、舊路線已失效 | 停語音；從新位置重試 |
| E-DIR-01 | 初始朝向或出口地標未知／OrientationGuide 缺失 | 顯示指引尚不可用，不給猜測左右 | guidanceUnavailable，可看路線摘要但不可開始，改已核對起點 |
| E-AUD-01 | 音檔不存在／解碼失敗 | 保留文字圖像及重試 | 不用另一語言靜默替代 |
| E-I18N-01 | 缺 key／參數錯誤 | 使用明確備援訊息，開發報錯 | CI 阻止正式包 |
| E-MAP-01 | 圖檔或變換無效 | 不顯示誤導疊圖 | 停止導航，提供資料問題資訊 |
| E-CONN-01 | 使用者回報設備不可用 | 本次避開該設備重算 | 無替代即 NoRoute；不表示官方即時資訊 |
| E-ASYNC-01 | 舊請求／音訊晚到 | 不顯示過時結果 | 以 requestId／generation 忽略 |

錯誤提示須七語、短句與可操作按鈕，不把 stack trace、schema 名稱或模型技術細節放進使用者流程。開發診斷另存本機測試報告。

## 19 非功能需求

以下是待量測的驗收目標，不是已測成績。基準裝置型號、OS、build hash、資料版本與測試方法必須同時記錄。

| ID | 項目 | 工程驗收目標 |
| --- | --- | --- |
| NFR-01 | 啟動 | release build 冷啟動至可操作首頁 p95 ≤3 秒，10 次測試 |
| NFR-02 | 路徑計算 | 30 節點／100 有向邊 fixture，plan＋指令 p95 ≤100ms，100 次 |
| NFR-03 | 定位回應 | 成功解碼 callback 後至位置確認畫面 p95 ≤500ms；不含相機對焦時間 |
| NFR-04 | 語言切換 | 本地語言文字更新 p95 ≤300ms；音檔開始 ≤1 秒，10 次／語 |
| NFR-05 | 中止語音 | 控制事件後 300ms 內停止舊聲音，不出現新舊交疊 |
| NFR-06 | 離線 | 未曾連網的新安裝完成三次完整流程；零 runtime 翻譯／TTS／LLM 連線 |
| NFR-07 | 穩定 | 連續 30 分鐘操作，含 20 次重掃、20 次換語言，無 crash／掛死 |
| NFR-08 | 可操作性 | 標準最小觸控區 48×48 CSS px；簡易主要按鈕高度 ≥56 |
| NFR-09 | 可讀性 | 標準正文基準 18 CSS px、簡易 24 CSS px；200% 系統字級主操作可達 |
| NFR-10 | 對比與非色彩提示 | 一般文字對比目標 ≥4.5:1；路徑與狀態同時使用圖示／文字 |
| NFR-11 | 螢幕閱讀 | 按鈕具語系化 semantics label，焦點順序符合流程，不重複讀裝飾圖 |
| NFR-12 | 包體 | 工程預算 assets ≤80MB、Android APK ≤120MB；超標記錄來源，先壓縮非必要素材 |
| NFR-13 | 可重現性 | 工具鏈、lockfile、資料／內容／音檔 hash 鎖定，相同 fixture 結果一致 |

P95 使用排序後 nearest-rank 法；10 次取第 10 筆，100 次取第 95 筆。相機實際掃碼另做印刷碼測試：一般室內光線、20–50 公分、各 anchor 至少 3 次；記錄成功率與失敗條件，不將 callback 速度冒充完整辨識速度。

簡易模式限制為一次一個動作、顯示必要選項、主要按鈕固定可見；高對比不能只換背景色而使地圖與圖示不可辨。泰文行高與換行、越南文附加符號、日韓字型須逐語實機確認。

## 20 隱私與資料安全

不要求帳號、年齡、國籍、電話、麥克風或 GPS。相機僅解 QR，不錄影、不存影像、不上傳原始掃描資料。記憶體中的路線與最後掃碼位置隨 session 結束清除；僅持久保存語言、UI 模式及靜音設定。

建置時只送固定自製句庫給已核准翻譯／語音服務，不傳使用者實際位置、輸入、照片或個資。API key 不進 git、App 或 screenshot。測試紀錄只保留 build、fixture ID、事件與耗時，若做志願者研究，使用匿名代碼且不寫可識別資料。

QR parser 限制 1024 bytes、欄位及型別；不支援任意 URL 跳轉。資產路徑限定 manifest 中的相對位置，拒絕 `..`、絕對路徑及外部 scheme。正式 QR 部署需管理單位許可、實際點位核對及維護；原型不能解決遭移貼的合法碼。

## 21 多目標認知路線與離線目的地搜尋

本節依使用者最新補充擴充為兩個 P1 高價值工作包：多目標候選路線與離線語意目的地搜尋。兩者不需要 runtime LLM、不呼叫語意 API，並沿用七語、來源限制及既有 P0。這是規格增補，不代表演算法、詞典或測試已實作。

### 21.1 可行圖與多候選路線

先依第 10 節建立相同硬限制的有向可行圖。一般／無障礙、區域、封閉／未知狀態、電扶梯方向、session 不可用設備一律先過濾，排序階段無權加回。

單次 Dijkstra／A* 求一條對指定成本最優的路徑；多條候選需額外枚舉機制。本版工程預設用 Yen K-shortest simple paths，內層呼叫 Dijkstra，每種已啟用目標 K=3；以 edge ID 序列去重，最終最多保留 5 條有效路線。若只能找到 1 條就顯示 1 條，不憑空生成第二條。

有時間模型時分別以 routing_cost、travel_time_s 產生候選；保證保留兩個目標各自最佳路線，其餘依 routing_cost、edge ID 序列補滿上限。所有候選都不能含循環。路線需具完整可用的方向／地標指令，否則不得直接開始；摘要可標「指引尚不可用」。

A* 可作後續等價替換，但 heuristic 必須針對該成本可證明不高估；未校準的跨層像素不適合當時間或公尺 heuristic，無可信 heuristic 時取 0，相當於 Dijkstra。測試結果須與基準一致。

### 21.2 最快與最短的資料門檻

P1 可新增 edge `travel_time_s`（有限正數或 null）、`time_model_id`；package 新增 time model 版本、來源、核對日期、適用情境及失效狀態。電梯時間須包含已建模等待／搭乘假設，不能只拿垂直距離除一般步速。

保守門檻：本次可行圖的全部邊均具有相同可用時間模型且未失效，才啟用 `fastest`；任何邊時間未知，不得只排除未知邊後宣稱找到整張圖最快路線。缺資料時 UI 顯示「最短」並說明「目前無可靠時間估計」。

「最快」指靜態模型估計時間最少，不是即時人流、電梯故障或保證實際抵達時間。時間有完整依據才顯示估計秒／分；distance_m 未校準仍不能顯示公尺。P0 及未通過此門檻的 P1 均維持不顯示時間。

RouteOptions 在 P1 增加 `fastest`，與 `shortest`、`easyToUnderstand` 並列。未啟用時間模型卻請求 fastest，回 UnsupportedOptions 並請使用者確認改選 shortest；不靜默改變偏好。

### 21.3 容易理解的規則式排序

特徵包含距離或相對成本、turn_count、complex_junction_count、floor_change_count、instruction_count、landmark_count、ambiguous_segment_count、gate_transfer_count；未知公尺不能補 0，未核對地標不能算優勢。

工程預設規則：

```text
R(P) = 2*turns + 2*complexJunctions + 3*floorChanges
       + 3*ambiguousSegments + gateTransfers - min(landmarks,3)
```

複雜岔路是在該可行圖中，排除立即原路返回方向後仍至少有 3 條可離開邊的 decision node。只有第 11 節指令生成器已定義的轉向才計 turn；地標須對當前進入方向可見且有驗證，不能只數節點掛了幾個名稱。

容易理解候選的 `routing_cost ≤ shortest.routing_cost × 1.5`，有完整時間模型時另要求 `time ≤ fastest.time × 1.5`；均為示範工程上限，非研究證明。先移除被成本與 R 同時支配的候選，再選 R 最低、同分選 routing_cost 最低，再按 edge ID 序列排序。模型失敗或無其他候選時回到有效 shortest 摘要，明示易懂排序不可用。

分數來源標 `rule_baseline_v1`。UI 稱「容易理解」，說明為「候選路線中的規則評估」，不宣稱全圖認知成本最優或已證實降低迷路率。可顯示可核對的「少 2 次轉彎」「少 1 次換層」「經過電梯標誌」；相同路徑只顯示一張卡，不換色冒充差異。

### 21.4 候選介面與一致性

```text
CandidateRoutePlanner.generate(RouteRequest, GraphSnapshot) -> CandidateRouteResult
RouteRanker.compare(candidates, RankingConfig) -> RankedRouteComparison
```

結果至少包含 requestId、graphVersion、optionsSnapshot、timeModelVersion、rankingVersion、candidateRoutes、shortestRouteId、fastestRouteId（可 null）、easyRouteId（可 null）、可解釋特徵與降級原因。它沿用 Route／NavigationPlan 契約，不自建另一套位置狀態。

比較卡顯示可用的「估計最快／最短」及「容易理解」，由使用者選擇後才建立 active NavigationPlan。語言切換只換呈現，不改候選；新掃碼、目的地、mobility、不可用設備或圖版本變更均使舊候選失效。候選快取包含上述條件及排名／時間模型版本，不只以起終點當 key。

### 21.5 離線語意搜尋的範圍

本版 NLP 是可解釋的詞典概念對應、字串近似與有限意圖，不是任意自然語言理解。將「洗手間」「廁所」「toilet」「restroom」對應到 `facility.restroom`，再查同一份實際 POI，避免每個別名造出重複設施。

詞典涵蓋七語，跨所有已核准 alias 搜尋；UI 語言只作同分排序偏好及結果呈現，不限制可查語言。每個 alias 含 locale、text、concept_id 或 poi_id、來源及 review_status；只有 approved 項進 release 詞典。七語完整詞典仍須逐語核對，以下範例不代表外語詞庫已建立。

concept_id 是搜尋詞彙的命名空間（例如 facility.restroom），不屬於第 09 節 Graph entity ID；每一 alias 必須且只能設定 concept_id 或 poi_id 其中之一。concept 需在詞典 concepts 清單定義其 POI 類別／必要屬性，poi_id 必須引用實際啟用 POI；不存在引用、正規化後同詞對到多個概念須報驗證錯誤或明確列為歧義，不依陣列先後偷偷選一個。

```json
{
  "dictionary_version": "1.0.0",
  "aliases": [
    {"locale": "zh-TW", "text": "廁所", "concept_id": "facility.restroom", "review_status": "draft"},
    {"locale": "zh-TW", "text": "洗手間", "concept_id": "facility.restroom", "review_status": "draft"},
    {"locale": "en", "text": "toilet", "concept_id": "facility.restroom", "review_status": "draft"},
    {"locale": "en", "text": "restroom", "concept_id": "facility.restroom", "review_status": "draft"}
  ]
}
```

### 21.6 正規化與錯字容忍

輸入上限 80 個 Unicode code points，NFKC 展開後也必須 ≤80；去前後空白、字母小寫、合併重複空白，保留 rawQuery 以供本機本次顯示。正式地標及出口原文不被改寫。變音符號保留作第一層精確比對；越南文等不能先全面去音調再假稱同一字。

匹配順序固定：POI 名稱／明確編號精確→核准 alias 精確→完整詞組／核准詞邊界匹配→有界 fuzzy。中文及泰文不要求空白切詞，以字典最長詞組處理；不以任意 substring 將一段文字硬套設施，需保留已消耗及未理解的片段。

Fuzzy 預設使用自行實作的 Optimal String Alignment 編輯距離，插入、刪除、替換及相鄰交換各 1；以正規化 Unicode code points 計算，不以 UTF-16 code units。長度 <4 的 alias 不模糊；4–7 最大 1；≥8 最大 2，且 distance／maxLength ≤0.30。出口編號、QR／節點 ID、樓層碼永遠精確，不 fuzzy。

例：`restrom` 可建議 restroom；`toielt` 可由一次相鄰交換建議 toilet。低信心或同距離多個概念時列出「你是指…？」供確認，不自動導航。去音調可作低優先建議層，須單獨標 match_type，不覆蓋精確結果；不將「錯字容忍」宣稱可理解任意拼錯的七語句子。

### 21.7 簡單意圖與通行條件

僅辨識經七語校對的白名單詞組：設施／地標、最近、無障礙設施、避樓梯、指定已知樓層。目的地、POI 類別與路線需求分開保存；解析結果先顯示 chips 與原文，再由使用者確認，不因打一段字就開始走。

| 例子 | 解析與限制 |
| --- | --- |
| `toilet`／`洗手間` | facility.restroom；若有多個設施顯示候選，不擅選 |
| `nearest restroom` | restroom＋nearest；須有確認起點，按 Graph 成本排名 |
| `accessible toilet` | accessible_facility=true＋proposedOptions.stepFree，先按此需求算預覽，確認後才套用導航 |
| `不要樓梯` | 新增 excluded_edge_types=[stairs]，不等同使用者自稱輪椅；不能刪除既有 stepFree 條件 |
| `不是廁所`、`不要無障礙` | 否定／衝突需澄清，不套肯定關鍵詞，不默默解除既有需求 |
| 未知出口編號／不存在設施 | 無精確目的地，顯示查無結果與類別入口，不建虛構 POI |

P1 RouteOptions 增加 `excludedEdgeTypes`，只能進一步縮小可行圖，不覆寫 stepFree 的硬條件。搜尋「無障礙廁所」時同時過濾設施本身的 accessible_facility 及路線可及性；無匹配就清楚提示，不能換一般廁所。

合併契約為 `proposedOptions = 現有硬限制 ∪ 已辨識新增限制`。搜尋預覽與可達性／Graph 排名使用 proposedOptions；確認後才發布為 active options。accessible toilet 即使目前為 standard，也按 stepFree 檢查，只有樓梯可達者不得列可達。拒絕建議需求時回澄清／重新選擇，不保留「無障礙廁所」標籤卻偷偷改一般路線。

不支援的比較、否定範圍、混合多個目的地或剩餘文字含未理解條件，回 needsClarification；不能只取其中已知詞而捨棄可能重要需求。搜尋不從國籍／年齡推測語言或能力。

### 21.8 POI 排名與搜尋結果契約

```text
DestinationSearch.search(SearchRequest, DictionarySnapshot, GraphSnapshot) -> SearchResult
```

SearchRequest 包含 queryId、rawQuery、uiLocale、dictionaryVersion、intentRulesVersion、graphVersion、confirmedOrigin（可 null）、originConfirmationToken（可 null）、目前 RouteOptions。SearchResult 另保存 proposedOptions 完整 snapshot，並包含 queryId、normalizedQuery、recognizedIntents、unparsedTerms、status、matches、建議及版本；status 為 matched／suggestionsOnly／needsClarification／noMatch／invalidInput／incomplete。

每個 match 具 poiId、conceptId、matchedAlias、aliasLocale、matchType、editDistance、需求符合狀態、reachability、graphCost（未知時 null）。不生成虛構的機率信心；以 exact／alias／fuzzy 等可核對證據分級。

一般搜尋依匹配層級、編輯距離、已確認的可達性與成本、UI 語系偏好、poiId 排序；nearest 意圖在需求匹配後，以可行 Graph 成本為主。沒有可靠位置時標「距離未知，請先掃碼」，不使用直線距離或把上次走動前的位置稱為即時最近。不可達結果可列為不可達且不能點「開始」，不能以直線近覆蓋路網不通。

nearest 前必須重新掃碼，或明確按「我仍在此定位點」；本次搜尋流程建立 originConfirmationToken，包含 anchor、session、導航 revision、確認方式與時間。前進導航步驟、掃新碼、改起點或結束搜尋即失效；未確認只列設施、不標最近。文字使用「以您確認的位置排序」，不宣稱有持續感測使用者實際位置。

搜尋輸入可 debounce 150ms，較晚完成的舊 queryId 不得覆蓋新字串結果。使用者點選並確認解析需求後才進原 RoutePlanner；此步核對 queryId、graph／dictionary／intentRules 版本、完整 proposedOptions（含 excludedEdgeTypes）及 origin token 均一致，否則重算。語音只播放選定 POI 導航的既有七語句，不即時念任意搜尋輸入。

### 21.9 詞典封裝、隱私與效能

P1 package 加 `assets/search/dictionary.json`、`intent_rules.json`、`dictionary_version`、`intent_rules_version` 及 hash；只有啟用搜尋擴充才要求這些檔，P0 不因尚無詞典失敗。詞典、規則、可選索引隨靜態包／宿主 bundle，runtime 不走 CDN、embedding API、翻譯 API 或 LLM。

新增套件不是必要條件；純 TypeScript 匹配優先，任何第三方字典／fuzzy library 須先完成非中國來源、授權與再散布審查。查詢字串僅在記憶體使用，不上傳、不新增歷史或分析追蹤。只在使用者需要 nearest／可達排名時讀本 session 已確認節點，不請求 GPS。

工程效能目標：1000 POI／5000 alias 測試資料，20–80 code points 的有效查詢，warm search p95 ≤100ms（100 次，不含 150ms debounce），在 Android／iOS 實際 WebView 記錄。不能以效能截斷搜尋後假稱「確定不存在」；若達安全運算預算須回 incomplete 狀態並提供類別入口。這是待驗證目標，不是目前測試成績。

### 21.10 未來 ML 門檻

只有取得真實標註、明確受測條件與保留測試集時才可稱 ML。路線模型以受測者／場景分組避免洩漏，依任務選 MAE、Spearman 或 pairwise accuracy；不得以規則生成標籤再宣稱學到真實理解難度。

本地或離線預計算模型同樣受來源限制。排序模型不能增加通道或放寬需求；搜尋詞典及 fuzzy 版也不冒稱學習型 NLP。未通過模型資料、來源與效果審查時，不打包模型，規則版與 P0 可獨立運作。

## 22 測試資料與案例

### 22.1 合成路網 fixture

建立獨立於真實場域的 `routing_fixture_v1`，用可手算數值驗證演算法。以下邊均為明確有向邊；`↔` 表示建置時建立兩筆邊，非 runtime 隱含反向。

| 節點／邊 | 規格 |
| --- | --- |
| a、s1、l1 | B1；a 是 QR 起點，s1 樓梯入口、l1 電梯入口 |
| s2、l2、d、q | B2；d 為目的地、q 為另一 QR |
| a↔s1 | walk，cost=2 |
| s1↔s2 | stairs，cost=2，step_free=no、wheelchair=no |
| s2↔d | walk，cost=2 |
| a↔l1 | walk，cost=4 |
| l1↔l2 | elevator，cost=4，兩個可及欄位 yes |
| l2↔d | walk，cost=4 |
| q↔l2 | walk，cost=1 |

未特別標示者均 open、公共區、可及且 synthetic。一般 a→d 結果 a,s1,s2,d，成本 6；無障礙結果 a,l1,l2,d，成本 12；無障礙 q→d 成本 5。移除電梯兩向邊後 a→d 無障礙為 NoRoute，一般仍為 6。

另建 fixture 覆蓋單向電扶梯、完全斷圖、同成本路徑、未知狀態、付費區、非法負成本、零成本、缺引用、跨層無 connector 及公尺未知。fixture 不是北車真實資料，不能拿測試 PASS 當作場站路線驗證。

### 22.2 核心測試案例

| Test ID | 輸入／動作 | 必須觀察到的結果 |
| --- | --- | --- |
| T-DATA-01 | 重複 ID、缺 node、負／零 cost、未知 schema major | PackageLoadResult 失敗，不進導航 |
| T-DATA-02 | geometry 越界或跨層無 connector | 驗證失敗並指出檔案與欄位 |
| T-DATA-03 | distance_m=null、routing_unit=relative | UI 無公尺／分鐘，結果 totalDistanceM=null |
| T-QR-01 | 4 個已知 anchor 真機掃描 | 每碼正確節點及樓層，等待確認 |
| T-QR-02 | 普通網址、錯 JSON、1025 bytes、其他 site／major | 拒絕，不開外部網址、不改定位 |
| T-QR-03 | 1 秒內同碼回呼 10 次 | 只進一次確認；下一 scanning session 可再掃 |
| T-QR-04 | 宿主拒絕權限、永久拒絕、無相機或回覆 null | 可取消／依平台設定，不崩潰 |
| T-BRIDGE-01 | 無 flutterObject、錯 JSON、非字串回覆 | 不偽造掃碼，顯示可理解錯誤 |
| T-BRIDGE-02 | 逾時或 Web 取消後舊成功／null 回覆、再次點掃碼 | waiting_for_drain 不接新請求，遲到值只清空通道、不改定位 |
| T-BRIDGE-03 | 原生掃碼覆蓋 WebView、之後正常回覆 | listener 保留，可確認位置；真正卸載才清理 |
| T-RT-01 | fixture a→d standard | edge 對應正確、cost 6、經樓梯 |
| T-RT-02 | fixture a→d stepFree | cost 12、經電梯、不含 stairs／escalator |
| T-RT-03 | 電梯 closed／unknown／session unavailable | 無障礙 NoRoute，不回退樓梯 |
| T-RT-04 | 單向電扶梯反向規劃 | 不得逆行；無替代則 NoRoute |
| T-RT-05 | 不允許付費區是較短捷徑 | 排除捷徑，不因更短放行 |
| T-RT-06 | source=destination | 單 node、零 edges，進抵達確認 |
| T-RT-07 | 同成本邊路徑，重算 100 次 | 每次同 edge ID 字典序結果 |
| T-RT-08 | unknown 可及性、正向可走反向不可走 | stepFree 排除 unknown，保持有向語意 |
| T-RT-09 | 舊規劃慢於新規劃完成 | 只套用最新 requestId |
| T-NV-01 | 使用者連按下一步／上一步 | 一個事件一次推進，位置時間不改 |
| T-NV-02 | 從 a 路線導航中掃 q | 保留目的地與需求，新起點 q，cost 5，revision 更新 |
| T-NV-03 | 重掃取消或無效碼 | 舊位置與路線保持，未自動恢復語音 |
| T-NV-04 | 有效新位置但無路線 | 新位置可見、舊指引失效、語音停止 |
| T-NV-05 | 手動切 B1／B2 地圖 | confirmedLocation 及 instructionIndex 不變 |
| T-NV-06 | 最後一步但未確認抵達 | 不播已抵達；確認後 arrivalSource 正確 |
| T-DIR-01 | east→south、east→north、29／30／150／151 度 | 右、左及門檻分類符合第 11 節 |
| T-DIR-02 | 起始無可靠參照／跨層向量 | 不猜左右，不沿用其他層向量 |
| T-DIR-03 | 同一 anchor 不同 outgoing edge、同設備不同出口 | 查到對應人工 guide；缺項進 guidanceUnavailable，不能用 Route 成功當作可導航 |
| T-MAP-01 | 畫面長寬改變、縮放平移 | 節點與底圖仍對齊，逆變換命中正確 |
| T-MAP-02 | 地圖失敗或錯誤 viewBox | 不顯示誤導路線，不繼續導航 |
| T-L10N-01 | 七語全部 key、參數、POI、地標 | 無缺譯／空值／參數異名，原標示保留 |
| T-L10N-02 | 導航中七語輪切 | 路線不變，文字及音訊同語系 |
| T-L10N-03 | 長文、泰文、越南附加符號、日韓、200% 字級 | 無缺字／遮住操作，可捲動完成任務 |
| T-AUD-01 | 168 個核心音檔 | 全部可解碼、hash 正確、審查與權利齊全 |
| T-AUD-02 | 播放中切語言／重規劃／背景 | 舊聲音中止，不重疊、不播舊 token |
| T-AUD-03 | 連按重播 10 次＋慢載入 | 只有最新 generation 播放 |
| T-AUD-04 | 缺檔／解碼失敗／裝置靜音 | 保留文字圖像，主流程仍可完成 |
| T-AUD-05 | 暫停後換步驟再繼續 | 不續播前一指令 |
| T-OFF-01 | release 新安裝，先關網再第一次打開 | 掃碼、地圖、七語、語音全部可用 |
| T-OFF-02 | Web 版本無 CDN 快取（若交付 Web） | 必要 JS／WASM／字型本地化，離線能力按第 25 節定義驗收 |
| T-SRC-01 | 加入未核准依賴／音檔／endpoint | release gate 失敗，無自動來源放行 |
| T-PRIV-01 | 全流程網路與檔案檢查 | 無定位／照片上傳、無 key、無不必要權限 |
| T-LIC-01 | 正式服務的原始碼入口與部署版本 | 匿名可取得對應原始碼、授權、必要建置及上游修改 |
| T-PREF-01 | 重啟 App | 語言／模式／靜音保留，導航位置不自動恢復 |
| T-E2E-01 | 兩 QR 起點、四目的地、跨層、重掃、抵達 | 至少兩組完整閉環實機通過 |
| T-P1-01 | 最短與易懂候選相同或 ranker 失敗 | 只有有效最短路，不造差異 |
| T-P1-02 | 認知分數偏好含樓梯路線、使用者 stepFree | 樓梯從候選階段已排除，模型無權恢復 |
| T-MO-01 | 圖有多路徑、同路徑重複生成、圖只有一路 | 2–5 條去重 simple paths，只有一路則如實顯示 |
| T-MO-02 | 某可行邊缺 travel_time_s 或時間模型失效 | fastest 不可用，不排除未知邊後冒稱最快 |
| T-MO-03 | 最短／最快不同，易懂路徑超過 1.5 倍上限 | 分別保留各目標最佳，過度繞路不得當易懂推薦 |
| T-MO-04 | A* heuristic=0 與 Dijkstra、同分路線 | 最佳成本與確定性 tie-break 一致 |
| T-SRCH-01 | 洗手間、廁所、toilet、restroom | 同概念及同一組 POI，不產生重複設施 |
| T-SRCH-02 | restrom、toielt、短詞、出口代碼拼錯 | 合規 typo 僅建議，短詞及代碼不模糊猜測 |
| T-SRCH-03 | 七語別名跨 UI locale、泰文無空格、越南變音 | 可查核准 alias，保留精確語意，不按 UI 限制語言 |
| T-SRCH-04 | accessible toilet、不要樓梯、不是廁所、衝突需求 | 顯示待確認 chips／澄清，不解除 stepFree、不默認一般廁所 |
| T-SRCH-05 | 直線近但不連通、Graph 較遠可達、無確認起點 | 依可達成本排序；缺起點不聲稱最近 |
| T-SRCH-06 | 新字串後舊搜尋才完成、辭典／圖版本變更 | 不套過期結果；重算前不直接導航 |
| T-SRCH-07 | 斷網查詢、超長輸入、未核准 alias、運算中斷 | 離線可用、超限拒絕、不載未核准詞；中斷回 incomplete 而非 noMatch |
| T-SRCH-08 | 目前 standard，搜尋 accessible toilet，設施本身可及但只有樓梯可達 | 以 proposed stepFree 預覽，不列可達，確認前不改 active options |
| T-SRCH-09 | nearest 無新確認、確認後導航前進、NFKC 展開超過 80 | 無有效 origin token 不標最近；步驟前進使 token 失效；正規化前後均檢查長度 |

### 22.3 測試分層

純 TypeScript 單元測試覆蓋資料解析、硬限制、演算法、角度、指令與 token；DOM／component 測試覆蓋語言、模式、錯誤與導航狀態；城市通真機 integration 測試覆蓋原生橋接、相機、音訊、離線與完整操作。不能以 mocked player 測試證明 MP3 真機能播放，也不能以固定 route fixture 取代實際 Dijkstra 結果。

### 22.4 最低平台矩陣

| 條件 | P0 Android | iOS 城市通（P0）；獨立瀏覽器另測 |
| --- | --- | --- |
| 相機允許／拒絕／取消 | 必測 | 必測各平台行為 |
| 首次離線啟動 | 必測 | Web 首次離線依本地 bundle 封裝驗收，不以空快取 URL 可開啟為假設 |
| 七語字型及音檔 | 每語必測 | 同樣必測，不沿用 Android 結果 |
| 全主流程、旋轉／背景 | 必測 | 必測支援方向與平台生命週期 |
| 裝置型號及版本 | 記錄實際值 | 記錄瀏覽器、OS、HTTPS／安裝方式 |

## 23 驗收與證據

### 23.1 發布門檻

| Gate | 必要證據 | 未達處置 |
| --- | --- | --- |
| GATE-01 城市通整合 | 服務註冊、Android／iOS WebView 與 QR bridge 實測 | 不宣稱城市通整合完成 |
| GATE-02 資料與方向 | 範圍、節點邊、來源、驗證狀態及已核對 Demo 路線 | 只能 synthetic demo，不對外提供實際導航 |
| GATE-03 路線正確 | T-RT、T-NV、T-DIR、T-MAP 相關案例 | 停止新增功能，先修正 |
| GATE-04 七語 | 所有必要 UI key 與 168 核心音檔完成審查／測試 | 標實際支援，不算本版 P0 完成 |
| GATE-05 來源與權利 | 無 unverified 依賴／素材；模型、服務及輸出權利通過 | 排除或換已核准來源，不降低限制 |
| GATE-06 離線與穩定 | 新安裝關網完成、連續三次主流程、30 分鐘壓力操作 | 不宣稱完全離線與 Demo Ready |
| GATE-07 交付文件 | build hash、package、QR 對照、README、授權、測試結果 | 補齊後才交付 |
| GATE-08 P1 擴充（啟用才適用） | T-MO／T-SRCH、時間模型或降級、七語詞典來源與版本 | 未通過則不宣稱對應擴充完成，不影響獨立 P0 驗收 |

這些 gate 是未來產品驗收，不是本次 SPEC 能否提交的門檻。提交規格只代表要求已定義，不能將表格勾成 App 已通過。

### 23.2 證據目錄

```text
docs/acceptance/
  release-checklist.md
  environment.md
  requirements-results.csv
  graph-verification.csv
  translations-review.csv
  audio-review.csv
  provenance-review.csv
  demo-runs.md
  performance-results.csv
```

每筆測試紀錄最少含 testId、buildCommit、packageVersion、device、OS、locale、options、expected、actual、result、tester、testedAt、evidencePath。未執行標 not_run，不填 PASS。證據路徑不得指向不存在的影片或私人帳號資料。

### 23.3 可用性觀察

若有時間，邀請自願參與者比較平面圖與本產品，記錄任務、順序、成功、時間、走錯、求助與主觀難度。避免把第二次走同路更熟悉的效果歸因給產品；使用不同但相近任務或交錯順序。沒有樣本時只展示設計與功能證據，不編造降低迷路率。

## 24 開發分工與時程

本節是依賴與里程碑，並非授權本次直接開始開發 App。實作前應把每項交付拆成具體檔案與失敗／成功測試。

### 24.1 責任

| 角色 | 主要交付 | 對接契約 |
| --- | --- | --- |
| A 產品／整合 | GATE-01、範圍、操作流程、展示及打包 | 本 SPEC、release checklist |
| B 路網／演算法 | JSON、Dijkstra、可及性、方向與 fixture | GraphSnapshot、RouteResult、Instruction |
| C Web／宿主整合 | 網頁、掃碼 bridge、地圖、狀態、必要宿主 patch | QrDecodeResult、NavigationSession |
| D 多語／音訊 | key、翻譯、校對、168 檔、播放器 | locale、sentenceId、voice manifest |
| 全員 | 真機閉環、授權與來源審查 | 測試與 provenance 報告 |

角色可兼任；七語校對需要實際語言能力，不能假設四名開發者自然涵蓋七語。任何 reviewer 未確認的語言保持 draft。

### 24.2 24 小時相對時程

| 時段 | 工作與依賴 | 退出條件 |
| --- | --- | --- |
| H0–H1 | 確認城市通格式、裝置、資料與非中國來源方案；凍結七語 key | 決策及風險有負責人 |
| H1–H3 | 合成 fixture、schema、基礎專案；翻譯草稿平行 | 有可載入 package 與 fixture |
| H2–H5 | Dijkstra、無障礙、單向與 NoRoute 測試 | T-RT 核心案例通過 |
| H3–H8 | 畫面、圖層、步驟狀態；七語資產生成 | 可手動測起終點，內容不與 UI 耦合 |
| H5–H9 | 真機 QR、重新定位、token 與地圖一致性 | 掃第二碼能重算，不播舊音訊 |
| H3–H10 | 語言校對、音檔聽檢、字型及離線驗證 | 七語審查狀態可查，缺口未被隱藏 |
| H9–H13 | 標準／簡易、完整三種 Demo 情境 | 第一版閉環可操作 |
| H13–H17 | 全流程整合、真實範圍核對、失敗恢復 | 核心測試與來源報告 |
| H17–H20 | 修復、必要 UI 打磨；P1 僅在 P0 通過後 | 無阻斷錯誤，不犧牲七語與路線 |
| H20–H22 | 120 秒／5 分鐘展示、三次實機、release 打包 | Demo 及測試證據齊全 |
| H22–H24 | 凍結功能，只修阻斷；依正式截止提交 | hash、交付及確認回條 |

以上 H 是開始工作後相對時數，不是官方競賽時程，不能取代主辦的提交截止。H12 尚無掃碼→路徑→地圖→中文語音時停止所有 P1；H18 停止新增功能；H22 凍結。七語仍有缺口時公開列出，不能自行縮成三語後宣稱全部完成。

### 24.3 實作工作包與依賴

| 工作包 | 依賴 | 具體交付與必要測試 |
| --- | --- | --- |
| WP-01 資料基礎 | 範圍與 schema | loaders、validator、fixture；T-DATA |
| WP-02 路線與指令 | WP-01 | RoutePlanner、InstructionBuilder；T-RT、T-DIR |
| WP-03 掃碼與 session | WP-01、WP-02 | QrDecoder、Controller；T-QR、T-NV |
| WP-04 地圖與畫面 | WP-02、WP-03 | FloorMap、screens、模式；T-MAP、T-NV |
| WP-05 七語內容 | 中文 catalog、來源核准 | 七語 JSON catalog、TypeScript 型別、字型；T-L10N |
| WP-06 語音 | WP-05、語音權利核准 | manifest、168 檔、VoiceService；T-AUD |
| WP-07 交付整合 | WP-03 至 WP-06 | 官方入口、release、README；T-OFF、T-E2E、T-SRC |
| WP-08 P1 擴充 | 全部 P0 穩定 | 候選排序／最近設施；T-P1 |
| WP-09 P1 離線搜尋 | WP-01、WP-02、WP-05、核准七語詞典 | DestinationSearch、字典／意圖資料、確認 UI；T-SRCH |

## 25 建置交付與維護

### 25.1 最低交付清單

1. 原始碼與鎖定依賴、工具鏈版本、經主辦接受的執行入口。
2. 實際可執行 release 檔、build commit、SHA-256、安裝與啟動步驟。
3. 完整本地 package、七語 catalog／字型／語音、版本及 hash manifest。
4. QR 列印檔及 anchor→node→樓層→地標對照表，標示 Demo 用途。
5. 資料來源、示範範圍、核對方式、限制、非即時狀態。
6. 程式授權、第三方 notices、音檔／字型／地圖權利與來源審查表。
7. 實際測試結果、已知問題、展示劇本與重新開始方式。
8. 未來重做翻譯／音檔的工作設定與文件；不附憑證，不依賴原開發者私人帳號才能執行 App。

### 25.2 建置檢查順序

未來 CI 順序：來源允許清單→catalog／audio／Graph validation→TypeScript 型別檢查→單元／DOM 測試→靜態 build→宿主整合與真機測試。Node／TypeScript 與套件管理器版本在 web 子專案初始化時鎖定，不虛構目前已有 package scripts。

實作後應提供 `typecheck`、`test`、`build`、`validate:assets` 等腳本並在 README 對應實際命令；本次尚未建立 web/package.json，不能宣稱 npm／TypeScript 測試已通過。宿主建置則依開發指南執行 `fvm flutter pub get`、build_runner、analyze／test 與必要 release build。

### 25.3 WebView、原始碼與公開

正式驗收必須從城市通服務入口開始；Chrome 只作第一層驗證，不取代原生 qr_code_scan。Web 音訊需處理使用者手勢政策、生命週期、返回、路徑 base 及 MIME；如額外支援瀏覽器相機，另審查 library、WASM 與權限，不默默走外部 CDN。

原創程式碼以 AGPL-3.0-or-later 發布，根目錄 LICENSE 與主辦聲明已建立；上游 TownPass GPL 聲明保留。網頁須顯著提供與部署版本對應的原始碼及授權入口，包含必要建置／安裝資料。repo 查驗目前 private，尚需明確公開授權及匿名可讀驗證；不能以新增 LICENSE 代表已公開。得獎後至少一年公開為競賽義務，不是授權到期。

離線模式以第 04.4 節為準。全新無快取的 HTTPS URL 不可能僅憑靜態 hosting 就在斷網首次載入；需交付完整本地 bundle 與宿主可信載入 patch，並在 Android／iOS 測橋接及音訊。既有普通 HTTP cache 或 Service Worker 不視為已驗證保證。

### 25.4 更新與維護

資料更新先在獨立 package 驗證，通過後隨新版本發布；P0 不熱更新。變更節點 ID、QR 語意或座標基準需評估 major 升版與重印 QR；只修文案可升 content minor／patch。原路線 session 不與新圖混用。

正式場域需另外建立點位許可、定期巡檢、QR 替換、路網變更、電梯資訊更新、異常回報與營運責任；這些是部署前工作，競賽原型不聲稱已有正式維運能力。

## 26 競賽展示與評分對齊

### 26.1 評分版本

本 SPEC 依提案第 17 章保存團隊最新提供版本：初選服務應用 40、視覺 30、技術完整度 30；決選服務應用 25、技術完整度 30、穩定 20、視覺 15、創意公益 10。

Repo 的[競賽指南](./2026-fall-competition-guide.md)記錄官方線上規則決選 30 分項名稱為「服務完整度」，提案最新版稱「技術完整度」。配分總和均為 100，本 SPEC 不沿用提案第 13 章「加總不為 100」的舊備註；對外投件名稱與時限仍須核對現場最新公告。

### 26.2 120 秒實機劇本

| 秒數 | 操作 | 驗證點 |
| --- | --- | --- |
| 0–15 | 首頁與局部場域說明 | 痛點與範圍誠實 |
| 15–35 | 掃實體 QR，確認 B1 起點 | 真實掃碼、固定定位 |
| 35–60 | 選目的地，顯示 B2 路線與單步箭頭 | 跨層、圖像、地標 |
| 60–80 | 切無障礙並確認起點 | 排除樓梯，改電梯，不虛構位置 |
| 80–100 | 選越南／印尼／泰文之一及簡易模式，播放；展示七語選單 | 多語＋易讀，已驗證素材 |
| 100–115 | 我迷路了，掃第二碼 | 新定位與路線完整更新 |
| 115–120 | 說明七語本地素材與公共價值 | 不宣稱 runtime AI |

七語完整性以驗收報告證明，不必在兩分鐘逐語播放 168 檔。決選可增加來源、無路線、離線、架構與七語切換測試；禁止以展示預錄音檔的能力包裝成即時生成語音模型。

### 26.3 現場規則

依競賽指南，成果發表須投影實際作品，不使用簡報。備援錄影只用於排錯／核對，能否在發表使用須問主辦，不能自行當作替代 DEMO。功能、效果與來源只陳述實際完成部分；不展示未核准中國來源資源以求短期效果。

## 27 未決事項與風險

### 27.1 決策責任表

| ID | 未決事項 | 負責方向／期限 | 預設處置 |
| --- | --- | --- | --- |
| OPEN-01 | 微服務 destinationUrl、雙平台宿主整合及可信本地 bundle 載入 | A＋C，H1 前鎖方案 | WebView 網頁架構已定；整合與首次離線仍須實作驗證 |
| OPEN-02 | 示範 B1／B2 確切區域與現場核對能力 | B＋A，H2 前鎖範圍 | 未核對只 synthetic demo，不輸出真實站內行走保證 |
| OPEN-03 | 官方 PDF 改繪／重製權利 | A，素材進包前 | 用有權利依據的自製示意圖，清楚標示 |
| OPEN-04 | 翻譯及 TTS 供應商、區域、輸出再散布及競賽接受度 | D＋A，呼叫服務前 | 未核准不呼叫；真人翻譯錄音替代 |
| OPEN-05 | 七語具能力校對者及聽檢 | D，H3 前排定 | 未校對語系維持草稿，未通過七語 gate |
| OPEN-06 | Android／iOS 真機、宿主版本、前端工具與字型來源 | C，H1 前 | 依核對宿主快照鎖版本，未測平台不宣稱通過 |
| OPEN-07 | 泰文實際可用 voice | D，合成前 | 以已核准區域查詢並鎖版，不偷偷替換 |
| OPEN-08 | 正式題目、提交入口、凍結及截止 | A，立即核對行前信／現場 | 相對 24 小時規劃不能代替官方截止 |
| OPEN-09 | 來源限制是否延伸到不可得知的訓練資料或硬體上游 | A，遇不明項目前 | 不自行宣告豁免；標 unverified，排除該資源 |

七語與來源限制是已決事項，不列入可自行降低的待確認項。待確認的是實現方式、證據與場域，不是使用者已指定的方向。

### 27.2 主要失敗風險

| 風險 | 早期徵兆 | 應對 |
| --- | --- | --- |
| 地圖有圖但沒有可靠 Graph | 節點靠猜、跨層靠 x/y 相同 | 先固定局部與合成 fixture，逐段核對 |
| 七語擴張拖慢閉環 | 一直換服務、文字未凍結 | 先凍結 24 句與必要 UI，增量批次生成 |
| 語音／翻譯來源無法審查 | 免費代理、未知模型、只有「可商用」宣稱 | 排除，換可證明來源的服務或真人素材 |
| 方向錯誤比沒有導航更糟 | 掃碼即自動左轉、樓層向量混用 | 朝向確認＋人工核對 Demo 指令 |
| 無障礙路線誤用未知資料 | unknown 被當 true、設備狀態過時 | 保守排除、非即時提示、無路徑誠實告知 |
| 語音／地圖／步驟不同步 | 切語言還播舊句、重掃後仍畫舊線 | revision／generation 原子更新 |
| 只在開發機能跑 | 需雲端 key、字型或模型首次下載 | 新安裝先關網真機測試 |
| 比賽交付形式不符 | 只做獨立 App 或普通瀏覽器 Mock | 從城市通服務進入；H1 內確認宿主整合與本地載入方案 |

## 28 需求追溯與完成定義

### 28.1 來源到實作及驗收

| 來源需求 | SPEC | 對應測試／Gate |
| --- | --- | --- |
| QR 固定定位及不依賴 GPS | 第 06、07、09 節，FR-QR | T-QR、T-PRIV |
| 跨 B1／B2 路線與地圖 | 第 09–12 節，FR-RT／NV | T-RT、T-DIR、T-MAP |
| 無障礙硬條件 | 第 10 節 | T-RT-02／03／04／05／08，GATE-03 |
| 一步一圖、地標、易讀 | 第 05、06、11、19 節 | T-NV、T-L10N-03 |
| 我迷路了重新掃碼 | 第 06、07、18 節 | T-NV-02／03／04 |
| 使用者最新七語 | 第 13–15 節 | T-L10N、T-AUD-01，GATE-04 |
| 快速製作多語介面及語音 | 第 14 節 | catalog、批次工作、審查及可續跑工具契約 |
| 絕不採中國相關資源 | 第 16、20、23 節 | T-SRC-01、T-PRIV-01，GATE-05 |
| 預生成而非即時 AI | 第 14、15 節 | T-OFF、T-AUD、runtime 連線檢查 |
| 多目標認知路線 | 第 21.1–21.4 節，P1 | T-MO、T-P1，時間門檻與 rule／ML 標示 |
| 離線七語目的地搜尋 | 第 21.5–21.9 節，P1 | T-SRCH，詞典、typo、意圖與可達排名 |
| 24 小時可 Demo 與交付 | 第 23–26 節 | GATE-01 至 07、T-E2E |
| 官方資料、開源與部署許可 | 第 09、12、16、25 節 | provenance、QR 許可與驗證報告 |

### 28.2 P0 完成定義

- [ ] 主辦接受的交付形式已確認，交付入口真實可用。
- [ ] B1／B2 局部示範路網、4–6 個 QR、4–6 個目的地及 20–30 節點完成資料驗證。
- [ ] 至少兩組起訖完整閉環，至少一次跨層與重新定位，並含明確抵達確認。
- [ ] 同起訖一般／無障礙差異及無路線案例均通過，不放寬不可通行條件。
- [ ] 朝向、地標與跨層指引可理解，位置與步驟不混淆。
- [ ] 七語全部必要 UI／POI／地標翻譯及 168 核心音檔完成可追溯審查。
- [ ] 標準／簡易模式及大字、圖像、文字、語音可獨立使用。
- [ ] 新指令、換語言、重掃、背景時，舊音訊不重播或交疊。
- [ ] 新安裝關網可用，全部必要字型／掃碼／地圖／語音資產已封裝。
- [ ] 沒有未核准中國相關或來源不明依賴／模型／服務／素材，輸出權利允許所需交付。
- [ ] 正確標示示範範圍、人工建模、核對狀態、距離可信度與非即時限制。
- [ ] 三次完整實機演練、必要錯誤恢復及性能結果已記錄，無捏造 PASS。
- [ ] release hash、原始碼、README、授權、QR 對照、資料／內容版本及測試結果齊備。

本規格不勾選以上產品驗收項；實作後以證據逐項簽認。

## 29 參考來源

查閱日期：2026-11-07。外部頁面可能更新，實作時需核對適用版本；本規格不把工具文件當作供應鏈或輸出授權的完整證明。

| 編號 | 來源 | 本規格用途 |
| --- | --- | --- |
| S01 | [原提案](./提案企劃書.md) | 產品範圍、最新決策、24 小時規劃與評分版本 |
| S02 | [競賽完整指南](./2026-fall-competition-guide.md) | 賽制、開源、展示及交付待確認事項 |
| S03 | [臺北捷運車站設施資訊](https://data.taipei/dataset/detail?id=659b9f55-a687-4e55-a17b-ceca5743c514) | 官方設施資料入口，非可導航路網 |
| S04 | [臺北捷運臺北車站 PDF](https://web.metro.taipei/img/ALL/INFOPDF/051.pdf) | 原提案站圖參考；不據此聲稱已測量或獲再散布授權 |
| S05 | [TownPass](https://github.com/taipei-doit/TownPass)／[TownPass-Services](https://github.com/taipei-doit/TownPass-Services) | 原提案官方程式入口，實作時再核對整合規範 |
| S06 | [城市通開發指南](./城市通開發指南.md) | 最新 WebView 架構、宿主版本、橋接與授權；取代前版網頁採 Flutter ARB 的預設 |
| S07 | [Azure Translator 語言支援](https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support) | 七語代碼與文字翻譯能力 |
| S08 | [Translator Translate 方法](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate) | 批次字串、多目標語言與 key 映射 |
| S09 | [Azure Speech 語言及聲音](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts) | 候選語音，實際區域 voices list 另查 |
| S10 | [Speech TTS REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech) | 區域、授權與聲音清單查詢 |
| S11 | [Speech Batch Synthesis](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-synthesis) | 開發期非同步批次合成工作流程 |
| S12 | [mobile_scanner](https://pub.dev/packages/mobile_scanner) | 宿主原生掃碼依賴審查；不是微服務新增 Web 掃碼引擎的要求 |
| S13 | [TownPass 橋接原始碼](https://github.com/taipei-doit/TownPass/tree/c8e5d4d3f8f699f3d9d6cd68e129ed4da12037b3/lib/util/web_message_handler) | QR／JSON 字串協定；前版 just_audio 為獨立 Flutter 客戶端方案，不再是本案網頁依賴 |

### 本版相對原提案的明確取捨

WebView 微服務網頁覆寫獨立 Flutter 導航 App；宿主保留 Flutter 並使用原生掃碼；七語覆寫三語；重新定位為 P0；語音明確為預生成資產；規則排序及 ML 維持 P1；導航步驟不偽裝連續定位；距離未知不顯示公尺；中國相關與不明來源不得以功能或時程理由繞過；城市通相容、素材權利與現場驗證均需真實證據。

## 2026-11-07 使用者追加：浮動裝置端聊天

使用者明確要求浮動 ChatBot、Gemma 3 本地推論與 iPhone／Android 主動語音輸入。實作採官方 LiteRT-LM 0.19.1、Gemma 3 1B INT4，導航主流程仍不依賴模型；不使用遠端 LLM／Web Speech。聊天不能直接更改 Graph、QR 定位或路線，語音先成草稿再手動送出。完整程式契約、模型來源、手機安裝、HTTP／HTTPS 邊界及 not_run 清單見 [手機聊天與語音開發指南](./手機聊天與語音開發指南.md)。此追加不表示先前七語 P0、真實北車路網或真機驗收已全部完成。

正式地圖追加：依使用者最新要求，選終點、通行需求、七語詞典搜尋、持續掃碼、簡明模式與抵達確認已整合 `/station-map`，見 [正式地圖持續掃碼開發指南](./正式地圖持續掃碼開發指南.md)。真實走廊 Graph 缺口不能用合成路線或 zone BFS 補造，現階段只顯示樓層連結關係。
