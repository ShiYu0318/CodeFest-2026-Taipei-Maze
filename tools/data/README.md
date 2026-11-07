# 研究資料工具

只使用 Python standard library；Windows 的 TLS 相容性 fallback 使用系統 curl，維持憑證驗證。沒有安裝依賴，也不執行 Git、push、部署、付費服務或產品程式。

從 repo 根目錄執行：

```powershell
# 重新產生 UTF-8、北車子集與候選點；只覆寫 processed 的具名產出
python -B tools/data/prepare.py

# 唯讀驗證 hash、子集等價性與說明連結
python -B tools/data/validate.py

# 預設僅列出已核對的官方資料網址，不存取網路
python -B tools/data/fetch.py

# 明確啟用下載；已有相同 hash 就略過，異動資料不覆寫
python -B tools/data/fetch.py --download
```

`prepare.py` 先驗 raw 的 SHA-256；資料來源有新版本時不能只覆蓋 CSV，需一起核對 metadata、版本、顯名、資料清單及子集。

需要輸出到另一個資料夾時可用 `prepare.py --output <path>`，不會刪除既有資料夾。`fetch.py` 僅允許 manifest 列明的官方 CSV，不下載候選地圖或 OSM 幾何；不使用憑證。

研究資料格式與產品 runtime 的 Graph schema 不同。本工具不推導路網、方向、距離、即時狀態或無障礙可通行性，也不產生產品所需的七語文字與語音。
