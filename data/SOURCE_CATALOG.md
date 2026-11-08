# 資料來源索引

查閱日：2026-11-07。48 項候選；只有 D01–D10 官方 CSV 已納入本 repo 研究快照。
其他地圖、OSM、服務與素材僅列參考，不代表已核准使用或再散布。產品範圍與實作界線見 [README](../README.md) 與 [架構指南](../.github/ARCHITECTURE.md)；歷史 SPEC 保留於不納入 Git 的本地 docs/。

## D01 北捷車站設施
- 來源：[原始入口](https://data.taipei/dataset/detail?id=659b9f55-a687-4e55-a17b-ceca5743c514)
- 格式：CSV
- 用途：電梯、廁所、售票機等描述，補 POI 與 connector
- 限制：文字描述不是室內座標；內有舊商場地標，須對照新圖
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_facilities.csv](raw/trtc_facilities.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=f69dfd66-3d8e-408a-9645-c02384bda5b8)

## D02 北捷無障礙設施設置情形
- 來源：[原始入口](https://data.taipei/dataset/detail?id=3c799405-4e44-40dd-b747-daed09e88cdb)
- 格式：CSV
- 用途：無障礙出口、廁所、詢問處與導盲設施
- 限制：車站彙整，不能推導每條 edge 都可通行
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_accessibility.csv](raw/trtc_accessibility.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=5d45ef49-d60d-4354-b634-8dcf7d28da07)

## D03 北捷出入口座標
- 來源：[原始入口](https://data.taipei/dataset/detail?id=cfa4778c-62c1-497b-b704-756231de348b)
- 格式：CSV
- 用途：北車 M1–M8 出口坐標、出口編號、無障礙標記
- 限制：地理經緯度不是室內底圖 x/y，也不是標牌朝向
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_exits.csv](raw/trtc_exits.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=307a7f61-e302-4108-a817-877ccbfca7c1)

## D04 臺北市公廁點位
- 來源：[原始入口](https://data.taipei/dataset/detail?id=ca205b54-a06f-4d84-894c-d6ab5079ce79)
- 格式：CSV
- 用途：廁所名稱、地址、座標、無障礙與親子廁座數
- 限制：同一建築可能多層多廁；座標不可直接當門口或室內 node
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/taipei_toilets.csv](raw/taipei_toilets.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=9e0e6ad4-b9f9-4810-8551-0cffd1b915b3)

## D05 北捷無障礙電梯位置
- 來源：[原始入口](https://data.taipei/dataset/detail?id=ba6b64b1-a387-4b34-93c6-7c3bf2dad3db)
- 格式：CSV
- 用途：編號、服務樓層與文字位置，建立 connector 候選
- 限制：R10/BL12 兩列描述可重複；不是兩套不同電梯
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_lift_locations.csv](raw/trtc_lift_locations.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=87708f6a-a1a0-49ce-9b68-35ae4b135292)

## D06 北捷出口電梯與坡道 GPS
- 來源：[原始入口](https://data.taipei/dataset/detail?id=0a3bb422-9eb5-459b-a9d4-138456516183)
- 格式：CSV
- 用途：補 M2、M4 地面可及入口位置
- 限制：與出口中心點位置不同；不代表所有室內設備位置
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_exit_lifts_ramps.csv](raw/trtc_exit_lifts_ramps.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=61792c82-6609-41b2-9775-3a346934826d)

## D07 北捷無障礙設施異常公告
- 來源：[原始入口](https://data.taipei/dataset/detail?id=d884a9c6-f86c-4854-8da7-e6516ddbe612)
- 格式：CSV
- 用途：公告快照與已修復／停用描述
- 限制：實際欄位為項次、日期時間、路線、車站、說明；無北車列不等於所有設備正常
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_accessibility_anomalies.csv](raw/trtc_accessibility_anomalies.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=649c44eb-60b5-4746-a353-cbdc6651fc09)

## D08 北捷電梯維修預排時程
- 來源：[原始入口](https://data.taipei/dataset/detail?id=4f8b6fcd-5508-48fd-9b2f-98308ad1b0c4)
- 格式：CSV
- 用途：115 年 11 月維修日期與設備編號
- 限制：計畫排程，不含全部臨時故障；民國年及 D/N 時段代碼需解讀
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_lift_maintenance_11511.csv](raw/trtc_lift_maintenance_11511.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=d93aadfb-9f78-4000-a73e-48870481bafc)

## D09 北捷移設連通基本資料
- 來源：[原始入口](https://data.taipei/dataset/detail?id=1db4b00a-05a5-46dc-ad0a-eb31fb25b8ab)
- 格式：CSV
- 用途：北車 M6 與凱撒飯店連通案件線索
- 限制：是案件／進度清冊，不是室內連接 edge；商業空間權限與時段另查
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_connections.csv](raw/trtc_connections.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=ce068c0f-099c-4f73-9498-3d60b1e4947f)

## D10 北捷轉乘步行時間
- 來源：[原始入口](https://data.taipei/dataset/detail?id=782c2b71-8f5a-4575-9bf2-e86999be2863)
- 格式：CSV
- 用途：車站層級轉乘時間參考
- 限制：不能拆成每條 edge 的速度，亦不適用所有無障礙使用者
- 授權與狀態：已核對個別 metadata：政府資料開放授權條款－第1版；顯名及處理紀錄見 ATTRIBUTION.md；僅作研究參考，不作產品運行或現場通行證明
- 已收錄：[raw/trtc_transfer_walk_times.csv](raw/trtc_transfer_walk_times.csv)
- 取得方式：[資料端點](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=14fd1af0-dc2b-4174-87d4-fcb9de783496)

## D11 OSM 北車周邊室內與樓層候選資料
- 來源：[原始入口](https://overpass-api.de/api/interpreter)
- 格式：OSM JSON / derived GeoJSON
- 用途：取得走廊、樓梯、電梯、出入口及 level 標籤，減少全手工描圖
- 限制：850 個元素含周邊建物；不是 850 個已驗證路網節點。資料可能缺漏，level 範圍與方向不能盲轉
- 授權與狀態：ODbL-1.0，需保留歸屬與適用資料授權；不能直接改標 AGPL
- 本 repo 僅列索引，未收錄原始內容。
- 取得方式：[資料端點](https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3B%28nwr%5B%22indoor%22%5D%2825.043%2C121.510%2C25.051%2C121.522%29%3Bnwr%5B%22level%22%5D%2825.043%2C121.510%2C25.051%2C121.522%29%3Bnwr%5B%22railway%22%3D%22subway_entrance%22%5D%2825.043%2C121.510%2C25.051%2C121.522%29%3Bnwr%5B%22highway%22%3D%22elevator%22%5D%2825.043%2C121.510%2C25.051%2C121.522%29%3B%29%3Bout%20body%20geom%3B)

## M01 北捷台北車站完整資訊圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/INFOPDF/051.pdf)
- 格式：PDF 4 頁
- 用途：B1–B4 示意與設施圖
- 限制：圖面非量測平面圖，不可直接將像素換算公尺
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M02 高鐵台北站整體導覽圖
- 來源：[原始入口](https://www.thsrc.com.tw/event/map/Taipei2.pdf)
- 格式：PDF
- 用途：臺鐵／高鐵樓層與設施交叉核對
- 限制：固定 URL 內容會更新；保留 hash，無法單憑發布時間判定圖面版本
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M03 臺鐵臺北站 B2 圖
- 來源：[原始入口](https://www.railway.gov.tw/tra-tip-web/tip/img/0a00114c-3667-4e2f-a897-78b2864d8eba/1140x900)
- 格式：JPEG
- 用途：臺鐵／高鐵 B2 空間參照
- 限制：與北捷 B2 是不同區塊；不能僅因同樓層標記就相連
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M04 臺鐵臺北站 B3 圖
- 來源：[原始入口](https://www.railway.gov.tw/tra-tip-web/tip/img/09409b37-5bdf-4b04-9837-f9964c5cad44/1140x900)
- 格式：JPEG
- 用途：月台、設施與垂直設備位置參照
- 限制：付費區與乘車空間不在 SPEC 公共示範區預設範圍
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M05 臺鐵 B1／1F／2F 立體位置圖
- 來源：[原始入口](https://www.railway.gov.tw/tra-tip-web/tip/img/869f5722-348f-4de2-89ef-0cc727940cb9/1140x900)
- 格式：JPEG
- 用途：B1 外圈、服務設施與北捷／地下街連接
- 限制：透視圖不可直接作正投影座標或測距，舊商場名稱可能殘留
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M06 桃捷 A1 立體圖（下載待解）
- 來源：[原始入口](https://www.tymetro.com.tw/tymetro-new/tw/upload/station/20230526042350_1.png)
- 格式：PNG 連結
- 用途：A1 跨層與出入口參照
- 限制：此輪回傳 HTML 而非圖片，未保存偽圖片；由 P05 車站頁手動開啟再核對
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M07 北捷台北車站販賣店位置圖
- 來源：[原始入口](https://web.metro.taipei/img/MALL/infomap/BL12.pdf)
- 格式：PDF
- 用途：補商場走道、連通口與候選地標
- 限制：租戶可能變更，不能作持久地標或營業保證
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M08 站前 Z 地下街公共空間配置圖
- 來源：[原始入口](https://www-ws.gov.taipei/001/Upload/407/relfile/20232/9043781/822c8ec1-ad05-4acb-a5ed-b30ca11cc2f4.pdf)
- 格式：PDF
- 用途：補 Z 出口、走道、電梯與 K 區／北捷連接線索
- 限制：行政用途附圖，非最新導航核定圖，重製權利與現況另核對
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M09 北捷台北車站剖面圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/stationprofile/051.jpg)
- 格式：JPEG
- 用途：核對 B1–B4 垂直層次與設備
- 限制：剖面不是水平路網，也不能自動建立所有樓層互通
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M10 北捷 B1 分頁資訊圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-1.jpg)
- 格式：JPEG
- 用途：直接供 B1 標註與疊圖對照
- 限制：每頁須獨立座標校準；含機構及區域差異，發布前核對圖像權利
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M11 北捷 B2 分頁資訊圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-2.jpg)
- 格式：JPEG
- 用途：直接供 B2 標註與疊圖對照
- 限制：每頁須獨立座標校準；含機構及區域差異，發布前核對圖像權利
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M12 北捷 B3 分頁資訊圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-3.jpg)
- 格式：JPEG
- 用途：直接供 B3 標註與疊圖對照
- 限制：每頁須獨立座標校準；含機構及區域差異，發布前核對圖像權利
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## M13 北捷 B4 分頁資訊圖
- 來源：[原始入口](https://web.metro.taipei/img/ALL/INFOPDF/JPG/051-4.jpg)
- 格式：JPEG
- 用途：直接供 B4 標註與疊圖對照
- 限制：每頁須獨立座標校準；含機構及區域差異，發布前核對圖像權利
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P01 北捷台北車站設施與出口頁
- 來源：[原始入口](https://web.metro.taipei/pages2026/WebStation/051)
- 格式：HTML
- 用途：電梯樓層、廁所付費區、M 出口描述
- 限制：頁面與 CSV 可能不同步，需記錄差異
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P04 臺鐵臺北車站資訊頁
- 來源：[原始入口](https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/viewStaInfo/1000)
- 格式：HTML
- 用途：站圖入口與設施文字
- 限制：部分設備有電動輪椅不適用等限制；不可只看電梯圖示
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P05 桃捷 A1 台北車站資訊
- 來源：[原始入口](https://www.tymetro.com.tw/tymetro-new/tw/_pages/travel-guide/A1/A4)
- 格式：HTML
- 用途：A1 非付費設施、出口與 Y 區對應
- 限制：介紹列出口不保證目前可通行；須對照施工資訊
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P09 京站樓層導覽
- 來源：[原始入口](https://www.qsquare.com.tw/floor-guide.php)
- 格式：HTML / 圖片
- 用途：商場目的地與 B1/B2 連通口線索
- 限制：頁面預設圖不一定是 B1；店家與營業時間可能改變
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P10 站前地下街官網
- 來源：[原始入口](https://sfmm.org.tw/)
- 格式：HTML / 圖片
- 用途：Z 區資訊圖、管理與營業資訊
- 限制：用途與圖片權利需分開確認
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## P13 臺鐵中英詞彙對照
- 來源：[原始入口](https://www.railway.gov.tw/tra-tip-web/tip/tip00C/tipC20/view70)
- 格式：HTML
- 用途：公共設施與服務名詞 glossary 候選
- 限制：不是七語導航句庫；需要自行編寫情境與其他語言校對
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R01 桃捷車站出口結構化資料入口
- 來源：[原始入口](https://opendata.tycg.gov.tw/datalist/6a201c67-0019-48c3-ad7a-ba78d19fa2c6)
- 格式：資料目錄
- 用途：StationID、出口、座標與設備欄位
- 限制：僅核對頁面；本次未取得可解析的原始出口資料
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R02 台北地下街 Y 區官網
- 來源：[原始入口](https://www.taipeimall.com.tw/)
- 格式：HTML
- 用途：Y 區導覽與管理入口
- 限制：本次工具連線 502，未聲稱取得最新版地圖
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R03 市場處地下街代號說明
- 來源：[原始入口](https://www.gov.taipei/News_Content.aspx?n=EEC70A4186D4C828&s=5B692574C86ACDF3&sms=87415A8B9CE81B16)
- 格式：HTML
- 用途：Y/Z 區域與出口編碼辨識
- 限制：編碼說明不等於現況通行清單
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R04 A1 與 Y 區施工通行問答
- 來源：[原始入口](https://www.radio.gov.taipei/News_Content.aspx?n=EE6904C858BEB925&s=F36D40ADC24228FF&sms=87415A8B9CE81B16)
- 格式：官方 FAQ
- 用途：識別可能受管制的 A1/Y 出入口
- 限制：維護／檢視日期不等於施工起訖；需對照工程公告，不直接永久關閉 edge
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R05 TDX Metro 官方 Swagger
- 來源：[原始入口](https://tdx.transportdata.tw/api-service/swagger/basic/268fc230-2e04-471b-a728-a726167c1cfc)
- 格式：Swagger
- 用途：Station、StationExit、LineTransfer、News/Alert 候選
- 限制：需按官方授權與當時額度存取，本次未使用帳號取得 payload
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R06 TDX 官方認證指引
- 來源：[原始入口](https://motc-ptx.gitbook.io/tdx-xin-shou-zhi-yin/api-shi-yong-shuo-ming/api-shou-quan-yan-zheng-yu-shi-yong-fang-shi)
- 格式：文件
- 用途：Client Credentials 與 Bearer token 的合法取得方式
- 限制：憑證不得嵌入 Flutter；不承諾固定免費額度
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R07 臺北旅遊網 Open API
- 來源：[原始入口](https://www.travel.taipei/open-api)
- 格式：Swagger / JSON / XML
- 用途：出口附近目的地、景點及官方多語名稱
- 限制：已下載 Swagger；目前文件 lang 僅 zh-tw/zh-cn/en/ja/ko，不是七語皆有
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R08 國土測繪中心 WMTS
- 來源：[原始入口](https://maps.nlsc.gov.tw/S09SOA/pro/Wmts_ajax_main.jsp)
- 格式：WMTS / GetCapabilities XML
- 用途：室外出口定位與周邊底圖
- 限制：不含室內走廊；各圖層授權、離線儲存及服務用量另核對
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R09 OSM Simple Indoor Tagging
- 來源：[原始入口](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging)
- 格式：schema 文件
- 用途：level、corridor、door、elevator 等標註解讀
- 限制：層級可多值或範圍；缺失標籤不等於可通行
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R10 OSM 資料授權
- 來源：[原始入口](https://www.openstreetmap.org/copyright)
- 格式：ODbL 文件
- 用途：原始資料與衍生資料的歸屬／分享條件入口
- 限制：資料授權與 App 程式授權分開記錄
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R11 Google Noto 字型入口
- 來源：[原始入口](https://fonts.google.com/noto)
- 格式：Font / license
- 用途：七語離線字型候選
- 限制：本次未下載字型或完成 SPEC 全來源審查；挑選檔案須保留 license
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R12 Material Symbols
- 來源：[原始入口](https://developers.google.com/fonts/docs/material_symbols)
- 格式：SVG / font / guide
- 用途：箭頭、電梯、廁所等自製指引圖示候選
- 限制：素材與站方標示不一定相同；用字及授權逐項確認，本次未打包
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R13 OGC IndoorGML
- 來源：[原始入口](https://www.ogc.org/standards/indoorgml/)
- 格式：標準 / schema
- 用途：室內拓樸及空間模型參考
- 限制：是建模標準，不是北車現成資料，不要求改寫 SPEC JSON
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R14 Commons 2019 年站內地圖照片
- 來源：[原始入口](https://commons.wikimedia.org/wiki/File:Taipei_Main_Station_1F_Floor_Plan_20190811.jpg)
- 格式：JPEG 來源頁
- 用途：告示牌版型與舊地標參考
- 限制：頁面標 CC BY-SA 4.0；2019 年舊圖且照片中的底圖權利須另辨，不作最新導航資料
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R15 Commons 2014 地下街配置圖
- 來源：[原始入口](https://commons.wikimedia.org/wiki/File:台北車站地下街配置圖.png)
- 格式：PNG 來源頁
- 用途：Y/Z/K/R/M 整體關係參考
- 限制：頁面標 CC BY-SA 4.0；2014 年資料，商場名稱與連接現況需更新
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R16 政府資料開放授權條款
- 來源：[原始入口](https://data.gov.tw/license)
- 格式：授權文件
- 用途：保留提供單位、資料版本與顯名聲明
- 限制：不能推定所有官方網站圖片都自動適用該條款
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R17 Azure Speech 語言與 voice 文件
- 來源：[原始入口](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- 格式：文件 / voices API 入口
- 用途：七語預生成音檔選型依據
- 限制：未呼叫服務、未取得聲音、不代表權利／區域審查完成
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。

## R18 北捷電梯施工頁
- 來源：[原始入口](https://www.metro.taipei/cp.aspx?n=D6B0BA338E694562)
- 格式：HTML
- 用途：人工核對設備公告
- 限制：頁面無公告不保證所有設備當下可用；不是現場感測
- 授權與狀態：需逐項核對；本次未通過 SPEC release 審查
- 本 repo 僅列索引，未收錄原始內容。
