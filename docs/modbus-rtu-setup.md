# Modbus RTU 串口模式設定指南

VEGA SDK 預設使用 **Modbus TCP**，若需要透過 RS-232 / RS-485 串口與設備通訊，可切換為 **Modbus RTU** 模式。

---

## 前置需求

- 串口裝置已連接至主機（USB 轉串口、COM port 或 `/dev/ttyUSB*`）
- 已確認設備的通訊參數（Baud Rate、Data Bits 等）

---

## 設定步驟

### 1. 修改 `configs/settings.json`

找到 `modbus` 區塊，將 `mode` 改為 `"rtu"`，並填入串口參數：

```json
{
  "modbus": {
    "mode": "rtu",
    "serial": {
      "path": "COM3",
      "baudRate": 9600,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "none"
    }
  }
}
```

#### 參數說明

| 參數 | 說明 | 常見值 |
|---|---|---|
| `path` | 串口裝置路徑 | Windows: `COM3`、`COM4`；Linux: `/dev/ttyUSB0`、`/dev/ttyS0` |
| `baudRate` | 傳輸速率（Baud） | `9600`、`19200`、`38400`、`115200` |
| `dataBits` | 資料位元數 | `8`（Modbus RTU 標準） |
| `stopBits` | 停止位元數 | `1`（Modbus RTU 標準） |
| `parity` | 奇偶校驗 | `"none"`、`"even"`、`"odd"` |

> **提示：** `host` 和 `port` 欄位在 RTU 模式下不使用，保留即可。

---

### 2. 啟動服務

#### 直接執行（Windows / Linux）

```bash
npm run dev        # 開發模式
npm start          # 正式模式
```

#### Docker（僅 Linux）

設定串口裝置路徑環境變數，需與 `settings.json` 的 `serial.path` 一致：

```bash
export MODBUS_SERIAL_PATH=/dev/ttyUSB0
docker-compose up
```

或在 `.env` 檔案中設定：

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

只需將 `settings.json` 的 `mode` 改回 `"tcp"` 並重啟服務：

```json
{
  "modbus": {
    "mode": "tcp",
    "host": "127.0.0.1",
    "port": 502
  }
}
```

`serial` 區塊保留不刪除，下次切換 RTU 時不需重新填寫。

---

## Linux 串口權限

首次使用串口時，可能需要將使用者加入 `dialout` 群組：

```bash
sudo usermod -a -G dialout $USER
```

登出再重新登入後生效。
