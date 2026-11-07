# 地圖與圖像入口

本目錄先保留可供組員取得與核對的連結。官方圖公開可讀不等於已確認可隨本專案公開再散布，故本次沒有加入圖檔，也沒有把它們改標 AGPL。

| ID | 原始來源 | 用途與限制 |
|---|---|---|
| M01 | [北捷 051.pdf](https://web.metro.taipei/img/ALL/INFOPDF/051.pdf) | 四頁 B1–B4，適合作分層核對；不是測量平面圖 |
| M10 | [北捷 B1 JPG](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-1.jpg) | 公共走道、M 出口、地下街連通 |
| M11 | [北捷 B2 JPG](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-2.jpg) | 板南線大廳與設備落點 |
| M12 | [北捷 B3 JPG](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-3.jpg) | 板南線月台／淡水信義線大廳關係 |
| M13 | [北捷 B4 JPG](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-4.jpg) | 淡水信義線月台參照，不是擴大 P0 的承諾 |
| M09 | [北捷剖面圖](https://web.metro.taipei/img/ALL/stationprofile/051.jpg) | 垂直層次，不可當水平路網 |
| M02 | [高鐵台北站圖](https://www.thsrc.com.tw/event/map/Taipei2.pdf) | 交叉核對不同營運單位與設施 |
| M03 | [臺鐵 B2](https://www.railway.gov.tw/tra-tip-web/tip/img/0a00114c-3667-4e2f-a897-78b2864d8eba/1140x900) | 與北捷 B2 為不同區塊，不可依樓層名稱直接連線 |
| M04 | [臺鐵 B3](https://www.railway.gov.tw/tra-tip-web/tip/img/09409b37-5bdf-4b04-9837-f9964c5cad44/1140x900) | 核對月台與設備，注意付費區 |
| M05 | [臺鐵 B1／1F／2F](https://www.railway.gov.tw/tra-tip-web/tip/img/869f5722-348f-4de2-89ef-0cc727940cb9/1140x900) | 立體透視圖，不直接量水平距離 |
| M07 | [北捷販賣店位置圖](https://web.metro.taipei/img/MALL/infomap/BL12.pdf) | 商場走道與連通口線索，租戶可能變更 |
| M08 | [Z 區公共空間配置圖](https://www-ws.gov.taipei/001/Upload/407/relfile/20232/9043781/822c8ec1-ad05-4acb-a5ed-b30ca11cc2f4.pdf) | 行政用途附圖，不視為最新導航核定圖 |
| M06 | [桃捷 A1 車站頁](https://www.tymetro.com.tw/tymetro-new/tw/_pages/travel-guide/A1/A4) | 立體圖連結本次回傳 HTML，需重新開啟確認，未冒充圖片存檔 |

來源逐項說明另見 [SOURCE_CATALOG.md](../SOURCE_CATALOG.md)。既有 repo 外的研究下載檔有 hash 及取得紀錄；日後將圖檔納入本 repo 前，需先補第三方權利、來源、修改方式、版本及審查紀錄。

處理時每層採獨立 viewBox，保留圖像的旋轉／比例，人工核對跨層設備；不要將像素當公尺，也不要用透視圖直接產生左右轉指令。看得見電梯圖示，不等於已確認服務樓層或輪椅可通行。
