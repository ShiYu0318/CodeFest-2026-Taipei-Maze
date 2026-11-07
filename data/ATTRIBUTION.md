# 資料顯名與研究副本審查

本次僅將 D01–D10 官方 CSV 與其轉碼／篩選結果納入版本管理。
個別資料集 metadata 的 license_name 已核對為「依政府資料開放授權條款-第1版」。
此開放資料依政府資料開放授權條款進行公眾釋出；使用者於遵守條款之前提下得利用之。
授權條款：[政府資料開放授權條款－第1版](https://data.gov.tw/license)。
資料與衍生結果保留本項授權，不因放入本 repo 就改成 AGPL；原創處理工具依根目錄授權。
此核對僅確認直接官方來源、metadata 所示授權與研究副本的顯名；不是導航安全認證或現場可通行保證。

| ID | 提供單位／年份／資料名稱 | 原始來源與版本依據 |
|---|---|---|
| D01 | 臺北大眾捷運股份有限公司／2026／北捷車站設施 | [資料集](https://data.taipei/dataset/detail?id=659b9f55-a687-4e55-a17b-ceca5743c514)；取得時間與 SHA-256 見 manifest.json |
| D02 | 臺北大眾捷運股份有限公司／2026／北捷無障礙設施設置情形 | [資料集](https://data.taipei/dataset/detail?id=3c799405-4e44-40dd-b747-daed09e88cdb)；取得時間與 SHA-256 見 manifest.json |
| D03 | 臺北大眾捷運股份有限公司／2026／北捷出入口座標 | [資料集](https://data.taipei/dataset/detail?id=cfa4778c-62c1-497b-b704-756231de348b)；取得時間與 SHA-256 見 manifest.json |
| D04 | 臺北市政府環境保護局／2026／臺北市公廁點位 | [資料集](https://data.taipei/dataset/detail?id=ca205b54-a06f-4d84-894c-d6ab5079ce79)；取得時間與 SHA-256 見 manifest.json |
| D05 | 臺北大眾捷運股份有限公司／2026／北捷無障礙電梯位置 | [資料集](https://data.taipei/dataset/detail?id=ba6b64b1-a387-4b34-93c6-7c3bf2dad3db)；取得時間與 SHA-256 見 manifest.json |
| D06 | 臺北大眾捷運股份有限公司／2026／北捷出口電梯與坡道 GPS | [資料集](https://data.taipei/dataset/detail?id=0a3bb422-9eb5-459b-a9d4-138456516183)；取得時間與 SHA-256 見 manifest.json |
| D07 | 臺北大眾捷運股份有限公司／2026／北捷無障礙設施異常公告 | [資料集](https://data.taipei/dataset/detail?id=d884a9c6-f86c-4854-8da7-e6516ddbe612)；取得時間與 SHA-256 見 manifest.json |
| D08 | 臺北大眾捷運股份有限公司／2026／北捷電梯維修預排時程 | [資料集](https://data.taipei/dataset/detail?id=4f8b6fcd-5508-48fd-9b2f-98308ad1b0c4)；取得時間與 SHA-256 見 manifest.json |
| D09 | 臺北大眾捷運股份有限公司／2026／北捷移設連通基本資料 | [資料集](https://data.taipei/dataset/detail?id=1db4b00a-05a5-46dc-ad0a-eb31fb25b8ab)；取得時間與 SHA-256 見 manifest.json |
| D10 | 臺北大眾捷運股份有限公司／2026／北捷轉乘步行時間 | [資料集](https://data.taipei/dataset/detail?id=782c2b71-8f5a-4575-9bf2-e86999be2863)；取得時間與 SHA-256 見 manifest.json |

## 處理紀錄

- raw/ 原封不動保存來源 bytes；包含原有 CP950 編碼、欄名與多行欄位。
- processed/*_utf8.csv：轉 UTF-8 BOM，移除空欄名與欄名前後空白，其餘值保留。
- processed/*_taipei_subset.csv／json：以北車名稱與公廁周邊 bbox 篩選，保留原始欄位與邏輯紀錄序號。
- processed/official_candidate_points.geojson：擷取經緯度候選，不推導室內座標、設備可及性、方向或路網連接。坐標基準與位置精度在產品採用前仍須核對。
- processed/csv_summary.json：實際解析的欄位、編碼與紀錄數。
- OSM 原始幾何及地圖圖像本次未加入 repo；只有來源、摘要及查詢文字，後續選用須另外完成授權及來源紀錄。
- 所有 product_release_approved／release_approved 保持 false；repository_copy_review=approved 只指這批官方研究副本。
