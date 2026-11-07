# Taipei Maze 研究資料包

這裡集中供組員建模、篩選及核對的資料，與 `/docs` 同層。依最新 SPEC 1.1 的城市通 WebView 微服務架構整理，**不是已可直接上線的導航資料包**，沒有修改團隊的產品決策。

快照日期：2026-11-07。所有資料尚未完成現地核對，不能把有設備、經緯度或圖面連接直接當成可通行路網。原始研究下載檔仍保留在本機 repo 外，這裡只納入已核對再散布授權的官方 CSV，其餘先保留來源索引。

## 從哪裡開始

| 組員要做什麼 | 建議先看 |
|---|---|
| 找可用的來源與下載網址 | [48 項完整索引](SOURCE_CATALOG.md)、[sources.csv](sources.csv)、[sources.json](sources.json) |
| 看實際欄位、編碼與筆數 | [csv_summary.json](processed/csv_summary.json) |
| 建立出口 POI | [M1–M8 出口子集](processed/trtc_exits_taipei_subset.csv) |
| 核對跨樓層電梯 | [電梯位置子集](processed/trtc_lift_locations_taipei_subset.json)、[地圖入口](maps/README.md) |
| 建立設施與廁所 POI | [設施描述](processed/trtc_facilities_taipei_subset.json)、[公廁候選](processed/taipei_toilets_taipei_subset.csv) |
| 在 GIS 工具查看官方候選點 | [official_candidate_points.geojson](processed/official_candidate_points.geojson) |
| 找 OSM 走廊、樓梯、電梯 | [查詢文字](queries/osm_indoor_bbox.overpassql)、[快照摘要](queries/osm_summary.json)；原始幾何未納入本 repo |
| 確認來源、取得時間與檔案版本 | [manifest.json](manifest.json)、[ATTRIBUTION.md](ATTRIBUTION.md) |
| 重做前處理或檢查資料 | [tools/data 使用說明](../tools/data/README.md) |

```text
data/
├── README.md
├── SOURCE_CATALOG.md
├── ATTRIBUTION.md
├── manifest.json           # 研究快照清單，不是產品 package manifest
├── sources.csv / sources.json
├── raw/                    # 10 份官方 CSV 原始 bytes
├── processed/              # UTF-8、北車子集、欄位摘要及候選點 GeoJSON
├── maps/README.md          # 圖資入口及限制，沒有未核准地圖圖檔
└── queries/                # OSM 查詢與研究統計，不是可導航 Graph
```

## 已收錄的官方 CSV

| ID | 資料 | 原始紀錄 | 子集紀錄 | 可以提供什麼 |
|---|---|---:|---:|---|
| D01 | 北捷車站設施 | 120 | 1 | 電梯、廁所、售票、飲水等位置描述 |
| D02 | 北捷無障礙設施 | 119 | 1 | 無障礙出口、廁所、詢問處等描述 |
| D03 | 北捷出入口座標 | 390 | 8 | M1–M8 的經緯度及標記 |
| D04 | 臺北市公廁點位 | 1531 | 41 | 北車與周邊公廁候選、無障礙及親子廁座數 |
| D05 | 北捷無障礙電梯位置 | 136 | 2 | 電梯編號及服務樓層；R10／BL12 可能重複描述 |
| D06 | 出口電梯／坡道 GPS | 193 | 2 | M2、M4 地面設施坐標 |
| D07 | 無障礙設施異常公告 | 1 | 0 | 公告快照；無北車列不代表北車全部正常 |
| D08 | 115 年 11 月電梯預排維修 | 337 | 7 | 設備編號、日期、日保／夜保代碼 |
| D09 | 移設連通案件 | 10 | 1 | M6 與凱撒飯店連通的核對線索 |
| D10 | 轉乘步行時間 | 21 | 1 | 車站層級參考，不能直接拆為每條路段 ETA |

子集以「台北車站／臺北車站」或站名「台北／臺北」篩選；D04 另外以周邊 bbox（西 121.510、南 25.043、東 121.522、北 25.051）篩選。**41 筆公廁不全在站內，51 個 GeoJSON 候選點也不等於 51 個經驗證室內節點。**沒有做重複設施合併。

## 格式與使用方法

- `raw/`：原始 CSV 不改動。9 份北捷檔案為 CP950；公廁檔為 UTF-8 BOM。
- `.gitattributes` 保留 CSV 的原始 bytes 與換行，避免 Windows／其他平台 checkout 時改變快照 hash。
- `processed/*_utf8.csv`：UTF-8 BOM，保留全部資料，移除空欄名及欄名前後空白。
- `processed/*_taipei_subset.csv`：較小的北車／周邊候選，適合先交給組員檢視。
- `processed/*_taipei_subset.json`：保留來源 ID、篩選方式、原始欄位與邏輯紀錄序號。
- 多行描述及逗號使用標準 CSV parser，不要逐行 `split(',')`。
- `source_record` 計算 CSV 邏輯紀錄（標頭為 1），不等於含換行欄位的文字行號。
- 民國日期、不同表的電梯編號與設備位置需另行對照；不要只用名稱自動 join。

可將這些資料作為 SPEC `nodes`、`edges`、`connectors`、`pois`、`landmarks`、`sources` 的建置輸入；仍需人工整理正式 schema。`qr_anchors` 的標牌面向與 `orientation_guides` 沒有現成完整來源，不能由 GPS 坐標猜出。

## OSM 的額外發現

研究 bbox 取得 850 個 OSM 元素，其中有 82 筆 `highway=corridor`、93 筆 `highway=steps`、22 筆 `highway=elevator`、44 筆 `railway=subway_entrance`。這些是資料標記數，可能包含周邊建物、不同樓層或同一設備的多個表示，不是實際設施總數。

OSM 原始幾何已在 repo 外研究檔留存；本次只提交摘要與可重現查詢，不將未完成來源核對的幾何自動納入產品。選用前需處理 [ODbL 條件](https://www.openstreetmap.org/copyright)、多值／範圍 `level`、可及性未知、單向／可逆電扶梯及連通關係。資料 AGPL 與 ODbL 不能混成同一個授權聲明。

## 已知限制

1. CSV 仍可能含「國光客運」「誠品書店」等舊地標；名稱需對照目前圖資與現場，不能直接作指引。
2. 出口坐標與出口電梯坐標可不同；不可平均、合併或直接當室內 viewBox 座標。
3. 不同營運單位都寫 B2，不代表在同一區塊、同一比例或可直接互通。
4. 維修是計畫，異常公告是文字快照，均不代表全設備即時狀態；不要從「沒有異常列」推出正常。
5. 廁所要另核對樓層、門口、付費區與開放時段；路線無階梯不代表廁所本身無障礙。
6. 沒有量測／校準前，不由圖片像素或不同樓層圖估算公尺與步行時間。
7. 只有原始資料與來源核對，不代表已建立、測試或發布產品路網。

## 授權與提交範圍

D01–D10 已逐一核對官方 metadata 的授權欄位，適用政府資料開放授權條款第 1 版；提供機關、版本依據與修改方式見 [ATTRIBUTION.md](ATTRIBUTION.md)。資料維持其原授權，原創工具依 repo 的 AGPL 聲明。

`repository_copy_review=approved` 只表示這批官方研究副本已核對來源、授權與顯名；`release_approved=false` 表示沒有宣稱資料已滿足產品現地、安全及完整性驗收。其他地圖、照片、OSM、字型、音檔仍是參考候選，不從公開網站或開源平台自動推定獲准。

這份資料包不改 repo 的 private 設定，也不執行 push、部署、遠端 AI 或任何付費服務。
