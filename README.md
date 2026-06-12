# VEGA SDK

MQTT 與 Modbus 之間的橋接服務。

訂閱 MQTT topic 接收設備狀態，將數值映射至 Modbus Holding Register，同時暴露 Modbus TCP/RTU Server 供外部系統讀寫。外部系統寫入 Register 時，指令會透過 MQTT 發布回設備。

---

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 編輯設定檔

編輯 `configs/settings.json`，填入 MQTT broker 連線資訊與 Modbus 模式（詳見[設定說明](#設定說明)）。

### 3. 產生設備對應表

準備好 Excel 設備清單後執行：

```bash
node converter/generate_config.js
```

### 4. 啟動服務

```bash
docker-compose up -d
```

---

## 啟動方式

### Docker Compose（推薦）

```bash
# 啟動
docker-compose up -d

# 重新 build 並啟動（修改 Dockerfile 後）
docker-compose up --build -d

# 停止
docker-compose down

# 查看 log
docker-compose logs -f
```

設定檔和 log 透過 volume 掛載，修改 `configs/` 後重啟容器即可套用。

### 直接執行 Node

```bash
npm run dev    # 開發模式（NODE_ENV=development）
npm start      # 正式模式
```

### PM2

```bash
npm run ecosystem
```

**Windows PM2 開機自啟：**

```bash
# 以系統管理員身份執行
npm install pm2-windows-startup -g
pm2 save
pm2-startup install
```

---

## 設定說明

### `configs/settings.json`

```json
{
  "mqtt": {
    "url": "mqtt://192.168.1.1:1883",
    "options": {
      "clientId": "vega-sdk",
      "username": "user",
      "password": "password",
      "reconnectPeriod": 1000,
      "connectTimeout": 60000,
      "keepalive": 60
    }
  },
  "modbus": {
    "mode": "tcp",
    "host": "0.0.0.0",
    "port": 502,
    "serial": {
      "path": "/dev/ttyUSB0",
      "baudRate": 9600,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "none"
    }
  },
  "ui": {
    "port": 8080
  }
}
```

| 欄位 | 說明 |
|---|---|
| `mqtt.url` | MQTT broker 位址 |
| `modbus.mode` | `"tcp"`（預設）或 `"rtu"` |
| `modbus.host` / `port` | TCP 模式使用 |
| `modbus.serial.*` | RTU 模式使用（見下方） |
| `ui.port` | Web 管理介面 port（預設 `8080`） |

> Modbus RTU 串口設定請參閱 [docs/modbus-rtu-setup.md](docs/modbus-rtu-setup.md)。

---

## 設備對應表產生工具

`converter/generate_config.js` 可將 Excel 設備清單轉換為 `configs/config_map.json`。

### Excel 格式

工作表名稱須為 `devices`，包含以下欄位：

| 欄位 | 說明 | 範例 |
|---|---|---|
| `Domain` | 頂層命名空間 | `building-a` |
| `Gateway` | 閘道器 ID | `gw-01` |
| `Device` | 設備 ID | `ac-101` |
| `Device_Type` | 設備類型 | `ac`、`switch`、`meter` |
| `Channel_Name` | 通道名稱 | `temperature` |
| `Channel_Value` | Modbus register 位址（整數） | `100` |

MQTT topic 自動組合為 `Domain/Gateway/Device`。

### 使用方式

1. 將 Excel 檔案放至 `converter/device_config.xlsx`
2. 執行：

```bash
node converter/generate_config.js
```

3. `configs/config_map.json` 自動更新，重啟服務後生效。

---

## Web 管理介面

服務啟動後可透過瀏覽器存取：

```
http://localhost:8080
```

提供設備對應表的瀏覽與編輯功能。修改後需重啟服務才會生效。

### API 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| `GET` | `/api/config` | 取得目前的 `config_map.json` |
| `POST` | `/api/config` | 更新 `config_map.json` |
| `GET` | `/api/device-types` | 取得支援的設備類型清單 |

---

## 支援的設備類型

| 類型 | 說明 |
|---|---|
| `ac` | 空調 |
| `switch` | 開關 |
| `panel` | 面板 |
| `hpd` | HPD |
| `meter` | 電表 |

新增設備類型請在 `lib/deviceLogic/` 建立對應的 Logic 類別並於 `DeviceManager.js` 註冊。

---

## 資料夾結構

```
configs/          設定檔（config_map.json、settings.json）
converter/        Excel → config_map.json 轉換工具
lib/
  cmd/            CLI 入口
  services/       MQTT / Modbus 服務
  deviceLogic/    各設備類型讀寫邏輯
  api/            Web 管理介面
  errors/         錯誤類別
  logger/         日誌（winston）
docs/             說明文件
```
