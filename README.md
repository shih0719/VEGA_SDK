# VEGA SDK

MQTT 與 Modbus 之間的橋接服務。

訂閱 MQTT topic 接收設備狀態，將數值映射至 Modbus Holding Register，同時暴露 Modbus TCP/RTU Server 供外部系統讀寫。外部系統寫入 Register 時，指令會透過 MQTT 發布回設備。

---

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設定環境變數

複製範本並填入實際值：

```bash
cp .env.example .env
```

編輯 `.env`，填入 MQTT broker 連線資訊與 Modbus 模式（詳見[設定說明](#設定說明)）。

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

設定檔和 log 透過 volume 掛載，修改 `configs/` 或 `.env` 後重啟容器即可套用。

**Modbus RTU 模式（Docker + Linux）：**

在 `.env` 設定 `MODBUS_MODE=rtu` 及 `MODBUS_SERIAL_PATH=/dev/ttyUSB0`，再加掛 RTU override：

```bash
docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up -d
```

### 直接執行 Node

```bash
npm run dev    # 開發模式（NODE_ENV=development）
npm start      # 正式模式
```

**Windows RTU 模式：** 在 `.env` 設定 `MODBUS_MODE=rtu`、`MODBUS_SERIAL_PATH=COM3`（依裝置管理員確認 port），直接 `npm start` 即可，無需 Docker。

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

所有設定透過 `.env` 管理（`.env.example` 為範本）。

| 變數 | 說明 | 預設值 |
|---|---|---|
| `MQTT_URL` | MQTT broker 位址 | — |
| `MQTT_CLIENT_ID` | MQTT client ID | — |
| `MQTT_USERNAME` | MQTT 帳號 | — |
| `MQTT_PASSWORD` | MQTT 密碼 | — |
| `MQTT_RECONNECT_PERIOD` | 重連間隔（ms） | `1000` |
| `MQTT_CONNECT_TIMEOUT` | 連線逾時（ms） | `60000` |
| `MQTT_KEEPALIVE` | Keepalive（秒） | `60` |
| `MODBUS_MODE` | `tcp`（預設）或 `rtu` | `tcp` |
| `MODBUS_HOST` | TCP 模式監聽位址 | `0.0.0.0` |
| `MODBUS_PORT` | TCP 模式 port | `502` |
| `MODBUS_SERIAL_PATH` | RTU 串口路徑（Windows: `COM3`，Linux: `/dev/ttyUSB0`） | — |
| `MODBUS_BAUD_RATE` | RTU 鮑率 | `9600` |
| `MODBUS_DATA_BITS` | RTU 資料位元 | `8` |
| `MODBUS_STOP_BITS` | RTU 停止位元 | `1` |
| `MODBUS_PARITY` | RTU 同位檢查 | `none` |
| `UI_PORT` | Web 管理介面 port | `18080` |

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
http://localhost:18080
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
.env              環境變數設定（不進 git）
.env.example      環境變數範本
configs/          設定檔（config_map.json）
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
