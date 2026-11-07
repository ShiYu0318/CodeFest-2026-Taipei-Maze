# Station Walking Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在正式地圖整合起終點搜尋、可稽核步行路網、最近設施與掃碼大箭頭。

**Architecture:** 保留現有 Vue、定位 controller 與 QR 橋接。將步行路網資料與驗證、最短路徑、設施排名及箭頭狀態分開，讓正式畫面共用同一份路線與限制。

**Tech Stack:** Vue 3、JavaScript modules、SVG、JSON、Node.js 20 built-in tests；不新增依賴。

**Spec:** `docs/superpowers/specs/2026-11-08-station-walking-network-design.md`

## Global Constraints

- 只修改 CodeFest；repo 保持 private，不修改 TownPass。
- 七語、使用者指定的中文文案指南、顯示模式「預設／兒童／長輩」。
- 未量測距離不得表示公尺／時間；未知可及性不得用於無障礙路線。
- 不從 QR 位置臆測手機面向，不以直線距離冒充最近步行路線。

## Review Focus

- 單向、閘門、付費區與斷路不得被反向或就近吸附繞過。
- 同一查詢在切換角色、條件或定位後必須失效。
- 同類設施不可達時，應選下一個合法候選或說明無路。
- 新掃碼不得重用舊箭頭或移除既有終點／無障礙條件。
- 邊界示意 QR 點與圖面未涵蓋入口不得被標成現地已驗證路段。

## Task 1：搜尋與名稱

**Files:** `StationScanPanel.vue`、`StationEndpointPicker.vue`、`DestinationSearch.vue`、七語目錄、`navigation-map-render.test.mjs`。

- [x] 名稱改為「預設／兒童／長輩」，七語選項與導覽同步。
- [x] 以真實 Vue 渲染測試重現搜尋藏在選單後的行為，再將搜尋放前、選單放入次要 disclosure。
- [x] 測試起／終點角色切換清空舊結果，起點按鈕不冒用目的地提示。
- [x] 加入起終點搜尋，沿用七語字典及選點事件；起點不套用目的地條件。
- [x] 跑完整測試與 lint，分段提交。

## Task 2：步行路網資料與最短路徑

**Files:** 新增 `station/walking-network.json`、`station/walking.mjs`、對應 tests 與建置／覆蓋檢查工具；視需要抽出 `navigation/route.mjs` 的純最短路徑引擎供共用。

**Interface:** `createWalkingRouter(network).route({startPointId, destinationId, stepFree, excludedEdgeTypes, unavailableConnectorIds, allowFareGates})` 回傳 route 或明確失敗原因；route 含來源、節點、路段、分層折線及相對成本。

- [x] 先測驗證錯誤、單向、斷路、成本最短、未知可及性排除與故障設備。
- [x] 實作資料驗證與 Dijkstra，保留既有合成核心行為。
- [x] 以重繪平面圖的走道外框（扣除非捷運 context 區塊）產生可視圖路網；設施圖示距走道 25 單位內才接推定入口（可及性未知），跨層只用 `station-connections.json`。未涵蓋點列於 `walking-network.json` 的 `coverage`（B1 38/44、B2 32/86、B3 35/35、B4 17/17；B2 未涵蓋多為台鐵／高鐵月台）。
- [x] `npm run build:walking` 產生、`validate:assets` 以 `--check` 防止過期；測試確認每段同層走道都在外框內、各層連通。尚未逐段對照官方 PDF 現地核對，閘門與付費區未建模。

## Task 3：最近設施與正式導航

**Files:** `station/scan.mjs`、`station/location.mjs`、`StationScanPanel.vue`、`StationMapView.vue`、七語目錄及 tests。

**Interface:** `createWalkingRouter(network).nearest(request)` 依同一合法步行路線成本回傳候選，不可達候選跳過。

- [x] 測最近候選依路網成本排序、無起點、未涵蓋與無候選。
- [x] 加入廁所／電梯／詢問處／飲水機／哺集乳室快捷鍵，沿用原有選點與行程對話框。
- [x] 在正式 SVG 顯示當前樓層虛線路線；起點、終點、無障礙與故障設備變動時自動重算。
- [ ] 跑完整測試與建置，提交。

## Task 4：掃碼後大箭頭

**Files:** `StationTripDialog.vue`、方向狀態純模組、正式地圖與 tests。

- [x] 測無路線、跨層上／下與地圖方位；不輸出左／右。
- [x] 行程對話框第二步顯示以地圖方位（北方朝上）為基準的大箭頭、下一個地標與「手機不知道你面向哪裡」提示；支援減少動態效果。
- [ ] 全部測試、lint、資產驗證、build、獨立審查、push、PR 與 CI；通過後合併並同步 main／預覽。
