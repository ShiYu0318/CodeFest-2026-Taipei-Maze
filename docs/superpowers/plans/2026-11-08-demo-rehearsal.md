# 實機 Demo 演練 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓兩小時內的實機 Demo 可重現導航、掃碼備援、跨樓層與無障礙失敗處理。

**Architecture:** 沿用正式 StationMapView 與路線引擎，只在 `demo=1` 顯示控制面板。情境資料放獨立本地模組，位置模擬透過既有 URL 點位機制，來源保留為 url，絕不偽造原生 QR 確認。地圖內導引同步顯示 Demo 標示及模擬動作。

**Tech Stack:** 現有 Vue 3、JavaScript modules、CSS、本地 JSON、Node test runner；不新增依賴。

**Spec:** [實機 Demo 端到端流程](../../Demo驗收流程.md)

## Global Constraints

- 僅修改 CodeFest 網頁與 QR 產碼端，不修改 TownPass 宿主。
- 七語與預設／兒童／長輩模式；保留紫色及紅色標記。
- 無障礙、排除類型及停用連線的過濾保持有效。
- Demo 必須明確標示，退出須清除模擬位置與行程；正式頁不顯示模擬入口。
- 不新增遠端模型、翻譯／TTS API 或任何新依賴；repo 保持 private。

## Review Focus

- 任意 query 不能注入不存在的點位或繞過路線過濾。
- 掃碼進行中不能被 Demo 操作覆蓋。
- 模擬更新必須保留目的地，重新規劃並重設步驟，不偽造 qr 來源／時間。
- 無可用路線時不開放以「下一個路段」假裝穿越限制。
- 退出 Demo 後不可留下模擬定位或電梯停用等偏好污染正式流程。

## Tasks

- [x] 補「帶我去」明確入口，手動選好起終點不要求掃碼；通過測試並提交 #21。
- [x] 寫出 5 分鐘腳本、雙平台驗收表與兩小時準備順序。
- [x] 建立 `app/src/station/demo-scenarios.mjs` 及測試：四個情境必須與正式路網結果一致；只接受固定情境與本地點位。
- [x] 建立 `StationDemoPanel.vue`：僅明確 query 開啟，載入情境、回到初始狀態、退出 Demo；七語文案。
- [x] 正式地圖接上模擬位置更新／抵達與電梯停用；導引覆蓋畫面也保留模擬標示；測試 URL 不帶 qr 確認資訊。
- [ ] 跑完整測試、Lint、資產驗證及建置，獨立審查後分段提交、推送 Demo PR。
- [ ] #21 與 Demo PR 各自 CI 通過後合併，同步 main，清理已合併且無用途的本地／遠端 branch。

## 最新使用者調整與執行紀錄

- Ruling：恢復所有類別，改成類別＋「最近可達」勾選＋單一帶我去，導航中仍可篩選；優先採最新使用者流程。
- Ruling：重新掃碼用小型原生 dialog 覆蓋當前網頁，不另開地圖內導引；相機 UI 維持城市通既有能力。
- Ruling：起點欄精簡為圖示按鈕與短標籤，長說明與沿途地標摺疊；起終點樓層分組也可摺疊。
- Review：已修正舊 QR 覆蓋新手動起點的標記問題；相應 rescan 測試採實際 router 已同步的新起點。
- #21：已於 ac9a7e0 合併，Android CI 通過；14 個已合併遠端 branch 與 3 個本地 branch 已清理。

- 驗證：238 項測試、Lint、資產驗證及正式建置通過；獨立審查複核通過。雙平台真機仍待現場勾選。

2026-11-08 最新調整：起點與終點維持同欄上下兩列，每列標籤、輸入欄及圖示對齊。僅保留一個主「帶我去」按鈕；箭頭與完整步驟在地圖下方，掃碼提示框覆蓋目前頁面。移除搜尋區的原型、字數上限及遠端 AI 說明文字，搜尋仍維持本地資料與既有輸入長度驗證。後續依使用者授權直接 push main，不再開 PR。
