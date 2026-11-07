# TownPass 本地測試整合

宿主獨立放在相鄰 `../TownPass` checkout，不將它的 `.git`、SDK、pub cache 或 build 產物加入本 repo。基準上游 commit 為 `c8e5d4d3f8f699f3d9d6cd68e129ed4da12037b3`，本地分支 `work/codefest-test-env`。

`smoke/` 是無額外前端依賴的橋接診斷頁，不是產品導航頁。只在使用者按鈕觸發時請求 deviceinfo／QR，不取得帳號或 GPS，不顯示裝置識別值，不保存 QR 內容。一般瀏覽器清楚顯示缺少 bridge。

```bash
bash scripts/townpass-env.sh serve
```

本地網址 `http://127.0.0.1:8765/` 只監聽 loopback，供這台 Mac 的 iOS Simulator 使用，不對 LAN 或 Internet 開放。實機不能拿自己的 127.0.0.1 當這台 Mac；需要實機時另行設定可信測試網址，不應直接對外暴露全部服務。

宿主的 `CodeFest 測試環境` 服務入口修改會以 patch 保存於本目錄，保留 TownPass GPL 及著作權聲明。套用前核對基準 commit、工作目錄乾淨與 `git apply --check`，不要覆蓋其他宿主修改。環境實測與啟動方式見 [測試環境](../../docs/測試環境.md)。
