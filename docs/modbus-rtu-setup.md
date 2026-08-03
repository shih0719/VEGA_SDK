# Modbus RTU 串口模式設定指南

VEGA SDK 預設使用 **Modbus TCP**，若需要透過 RS-232 / RS-485 串口與設備通訊，可切換為 **Modbus RTU** 模式。

---

## 前置需求

- 串口裝置已連接至主機（USB 轉串口、COM port 或 `/dev/ttyUSB*`）
- 已確認設備的通訊參數（Baud Rate、Data Bits 等）

---

## 設定步驟

### 1. 修改專案根目錄的 `.env`

找到 `MODBUS_MODE`，改為 `rtu`，並填入串口參數（可參考 `.env.example`）：

```env
MODBUS_MODE=rtu
MODBUS_SERIAL_PATH=COM3
MODBUS_BAUD_RATE=9600
MODBUS_DATA_BITS=8
MODBUS_STOP_BITS=1
MODBUS_PARITY=none
```

#### 參數說明

| 參數 | 說明 | 常見值 |
|---|---|---|
| `MODBUS_SERIAL_PATH` | 串口裝置路徑 | Windows: `COM3`、`COM4`；Linux: `/dev/ttyUSB0`、`/dev/ttyS0` |
| `MODBUS_BAUD_RATE` | 傳輸速率（Baud） | `9600`、`19200`、`38400`、`115200` |
| `MODBUS_DATA_BITS` | 資料位元數 | `8`（Modbus RTU 標準） |
| `MODBUS_STOP_BITS` | 停止位元數 | `1`（Modbus RTU 標準） |
| `MODBUS_PARITY` | 奇偶校驗 | `none`、`even`、`odd` |

> **提示：** `MODBUS_HOST` 和 `MODBUS_PORT` 在 RTU 模式下不使用，保留即可。

---

### 2. 啟動服務

#### 直接執行（Windows / Linux）

```bash
npm run dev        # 開發模式
npm start          # 正式模式
```

#### Docker（僅 Linux）

設定串口裝置路徑環境變數，需與 `.env` 的 `MODBUS_SERIAL_PATH` 一致，並使用 RTU override 檔：

```bash
export MODBUS_SERIAL_PATH=/dev/ttyUSB0
docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up
```

或在 `.env` 檔案中設定（`docker-compose.rtu.yml` 自動讀取）：

```env
MODBUS_SERIAL_PATH=/dev/ttyUSB0
```

> **注意：** Windows 上使用 Docker Desktop（WSL2）時，COM port 無法直接對應進容器。Windows 環境建議直接以 `npm run dev` 執行。

---

### 3. 確認啟動成功

服務啟動後，log 應出現：

```
Modbus RTU server starting on COM3 @ 9600 baud
Modbus RTU server started on COM3 @ 9600 baud with save interval 60000ms
```

若出現錯誤，請確認：
- 串口路徑是否正確（裝置管理員 / `ls /dev/tty*`）
- 串口是否被其他程序佔用
- 使用者是否有串口存取權限（Linux 需加入 `dialout` 群組）

---

## 切換回 TCP 模式

只需將 `.env` 的 `MODBUS_MODE` 改回 `tcp` 並重啟服務：

```env
MODBUS_MODE=tcp
MODBUS_HOST=0.0.0.0
MODBUS_PORT=502
```

其餘 `MODBUS_SERIAL_*` 欄位保留不刪除，下次切換 RTU 時不需重新填寫。

---

## Linux 串口權限

首次使用串口時，可能需要將使用者加入 `dialout` 群組：

```bash
sudo usermod -a -G dialout $USER
```

登出再重新登入後生效。
