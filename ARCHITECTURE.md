# VEGA SDK — 架構說明書

## 專案定位

VEGA SDK 是一個 **MQTT ↔ Modbus 雙向橋接服務**。

- **MQTT → Modbus（讀）**：訂閱 MQTT 裝置狀態訊息，解碼後寫入 Modbus Holding Register，供外部 Modbus Master 讀取。
- **Modbus → MQTT（寫）**：外部 Modbus Master 寫入 Register，觸發 MQTT 控制指令發佈到裝置。

---

## 目錄結構與職責

```
VEGA_SDK/
├── index.js                    # 程式進入點（委派給 lib/cmd/cli.js）
├── CoreModule.js               # 套件匯出點（供外部引用 CoreService）
│
├── configs/                    # 所有執行期設定檔（不進入程式邏輯）
│   ├── settings.json           # MQTT 連線 + Modbus 模式/埠口 + UI 埠口
│   ├── config_map.json         # Topic → {type, channels} 對應表
│   ├── device_logic.json       # 裝置欄位轉換規則（JsonDeviceLogic 的設定來源）
│   └── holding_registers.json  # Modbus Holding Register 持久化狀態（執行期自動產生）
│
├── lib/
│   ├── config.js               # 載入 settings.json + config_map.json → 建立 map / reverseMap
│   ├── configValidator.js      # 驗證 config_map.json 格式
│   ├── core.js                 # CoreService：串接 MQTT ↔ Modbus 的核心邏輯
│   ├── utils.js                # SameKeytoMap：channels 物件 + 解碼結果 → Map<addr, value>
│   │
│   ├── cmd/
│   │   ├── cli.js              # Commander.js CLI + readline REPL，組裝並啟動所有服務
│   │   └── index.js            # cli.js 的再匯出
│   │
│   ├── services/
│   │   ├── MqttService.js      # 包裝 mqtt 套件，emit: connected/message/disconnected/error
│   │   └── ModbusService.js    # 包裝 modbus-serial（TCP 或 RTU），emit: started/stopped/error/externalWriteRequest
│   │
│   ├── deviceLogic/
│   │   ├── BaseDeviceLogic.js  # 抽象基底類別：定義 read()/write() 介面與 parseJSON() 工具
│   │   ├── JsonDeviceLogic.js  # 依 device_logic.json 設定執行欄位轉換，繼承 BaseDeviceLogic
│   │   └── DeviceManager.js    # 單例 Registry：從 device_logic.json 載入，getDeviceLogic(type) 查詢
│   │
│   ├── api/
│   │   ├── server.js           # 原生 Node HTTP 伺服器，提供 Web UI + REST API
│   │   └── public/
│   │       └── index.html      # 瀏覽器 UI（config_map / device_logic / settings 管理頁）
│   │
│   ├── errors/
│   │   ├── base-error.js       # BaseError（所有自訂錯誤的基底）
│   │   ├── config-error.js     # ConfigError（設定檔格式錯誤）
│   │   ├── device-error.js     # DeviceError（裝置邏輯轉換錯誤）
│   │   ├── service-error.js    # ServiceError（MQTT / Modbus 連線錯誤）
│   │   └── index.js            # 統一匯出 + createError(type, message, code, details) 工廠
│   │
│   └── logger/
│       ├── logger.js           # Winston 設定（Console + File transport）
│       └── index.js            # 匯出 defaultLogger
│
├── converter/
│   └── generate_config.js      # 開發工具：從 Excel 試算表產生 config_map.json
│
└── tests/
    ├── core.test.js
    └── ModbusService.test.js
```

---

## 啟動流程

```
index.js
  └─> lib/cmd/cli.js
        ├── 載入 lib/config.js          → 讀取 settings.json + config_map.json
        ├── new MqttService(config.mqtt)
        ├── new ModbusService(config.modbus, holdingRegisters, saveCallback)
        ├── new CoreService(config, { mqttService, modbusService, deviceManager })
        │     └── _setupEventListeners()   (在建構子內完成事件綁定)
        ├── createUIServer(port)           → 啟動 HTTP 管理介面
        └── Service.start()
              ├── mqttService.start()      → 連線 MQTT Broker
              └── modbusService.start()    → 啟動 Modbus TCP/RTU Server
```

---

## 核心資料流

### 方向一：MQTT → Modbus（裝置狀態上報）

```
MQTT Broker
  │  (topic 訊息)
  ▼
MqttService
  │  emit("message", topic, buffer)
  ▼
CoreService._handleMQTTMessage(topic, message)
  │
  ├─ config.map.get(topic) → { type, channels }
  │    channels = { "channelName": modbusAddr, ... }
  │
  ├─ DeviceManager.getDeviceLogic(type)
  │    → JsonDeviceLogic（根據 device_logic.json 設定）
  │
  ├─ deviceLogic.read(message.toString())
  │    └─ validateData → parseJSON → transformRead
  │         轉換規則（per field）：
  │           passthrough / boolean_to_int / scale /
  │           enum / scale_split32 / skip
  │    → { channelName: value, ... }
  │
  ├─ SameKeytoMap(channels, readResult)
  │    → Map<modbusAddr, value>
  │
  └─ modbusService.setInternalHoldingRegister(addr, value)
       → holdingRegisters[addr] = value
       → hasChanges = true（觸發週期性存檔）
```

### 方向二：Modbus → MQTT（外部寫入控制指令）

```
外部 Modbus Master
  │  (寫入 Holding Register addr = value)
  ▼
ModbusService._handleExternalWriteRequest(addr, value)
  │  emit("externalWriteRequest", addr, value)
  ▼
CoreService._handleExternalModbusWrite(addr, value)
  │
  ├─ config.reverseMap.get(addr) → { topic, channel, type }
  │    reverseMap 在 config.js 啟動時從 config.map 自動建立
  │    topic = 原始 topic + "/command"
  │
  ├─ DeviceManager.getDeviceLogic(type)
  │
  ├─ deviceLogic.write(channel, value)
  │    └─ transformWrite
  │         轉換規則（per field）：
  │           passthrough / int_to_boolean / scale_inverse /
  │           enum_reverse / assert_one_to_zero
  │    → { function: { channel: transformed }, cmd: "write", source: "vega-SDK" }
  │
  └─ mqttService.publish(topic + "/command", JSON.stringify(message))
```

---

## 設定檔關聯

### settings.json

```json
{
  "mqtt":   { "url": "...", "options": { ... } },
  "modbus": { "mode": "tcp|rtu", "host": "...", "port": 502,
              "serial": { "path": "/dev/ttyUSB0", "baudRate": 9600, ... } },
  "ui":     { "port": 18080 }
}
```

- 被 `lib/config.js` 在啟動時讀取一次，結果注入 MqttService / ModbusService。
- Web UI 的 `POST /api/settings` 可熱更新此檔並觸發 `process.exit(0)` 重啟。

### config_map.json

```json
[
  ["building/room1/ac", { "type": "ac", "channels": { "power": 100, "temp": 101 } }],
  ...
]
```

- JSON 陣列格式（直接傳給 `new Map()`）。
- 被 `lib/config.js` 載入為 `config.map`（topic → {type, channels}）。
- `config.reverseMap` 在同一模組自動反推：`addr → { topic+"/command", channel, type }`。
- Web UI 的 `POST /api/config` 可覆寫此檔（需重啟才生效）。

### device_logic.json

```json
[
  {
    "deviceType": "ac",
    "readOnly": false,
    "defaultTransform": "passthrough",
    "fields": [
      { "name": "power",  "read": "boolean_to_int", "write": "int_to_boolean" },
      { "name": "temp",   "read": "scale", "scaleFactor": 10 }
    ]
  }
]
```

- `DeviceManager` 啟動時讀取，每個 entry 產生一個 `JsonDeviceLogic` 實例。
- Web UI 的 `POST /api/device-logic` 可即時覆寫並呼叫 `deviceManager.reload()`（**無需重啟**）。

### holding_registers.json

- 由 `cli.js` 在啟動時從磁碟載入（`loadHoldingRegisters()`），不存在則初始化 300 個 `0`。
- `ModbusService` 每 60 秒週期性存檔（有變更才存）；服務停止時再強制存一次。

---

## 事件匯流（Event Bus）

```
MqttService  ──emit──►  CoreService  ──emit──►  外部消費者
  connected                mqttConnected
  message     ─────────►  _handleMQTTMessage
  disconnected             mqttDisconnected
  error        ─────────►  (log only, no re-emit)

ModbusService ──emit──►  CoreService  ──emit──►  外部消費者
  started                  modbusStarted
  stopped                  modbusStopped
  error        ─────────►  error
  externalWriteRequest ──► _handleExternalModbusWrite
```

---

## REST API 端點

| 路徑 | 方法 | 說明 | 重啟需求 |
|---|---|---|---|
| `/` | GET | 提供 Web UI（index.html） | — |
| `/api/config` | GET | 讀取 config_map.json | — |
| `/api/config` | POST | 覆寫 config_map.json（驗證格式） | **需重啟** |
| `/api/device-types` | GET | 列出已註冊的 deviceType | — |
| `/api/device-logic` | GET | 讀取 device_logic.json | — |
| `/api/device-logic` | POST | 覆寫 device_logic.json 並 reload DeviceManager | 不需要 |
| `/api/settings` | GET | 讀取 MQTT URL / Modbus Port | — |
| `/api/settings` | POST | 更新 settings.json 並自動 process.exit(0) | 自動重啟 |

---

## Modbus 傳輸模式

由 `settings.json` 的 `modbus.mode` 控制：

| 模式 | 設定 | 用途 |
|---|---|---|
| `tcp` | `host` + `port` | 預設，透過網路連接 Modbus Master |
| `rtu` | `serial.path` + `baudRate` 等 | 串列埠實體連接（RS-485/RS-232） |

---

## 新增裝置類型

1. 在 `configs/device_logic.json` 新增一個 entry（`deviceType` + `fields` 轉換規則）。
2. 在 `configs/config_map.json` 新增 topic 對應，`type` 填入該 `deviceType`。
3. 若欄位轉換邏輯無法用現有規則（passthrough/boolean_to_int/scale/enum/scale_split32）表達，才需繼承 `BaseDeviceLogic` 撰寫自訂類別，並呼叫 `DeviceManager.registerDeviceLogic(type, MyClass)`。

---

## 模組依賴圖

```
index.js
  └─ lib/cmd/cli.js
       ├─ lib/config.js ──── configs/settings.json
       │                └─── configs/config_map.json
       ├─ lib/core.js
       │    ├─ lib/services/MqttService.js
       │    ├─ lib/services/ModbusService.js
       │    │    └─ configs/holding_registers.json (讀/寫)
       │    ├─ lib/deviceLogic/DeviceManager.js
       │    │    ├─ lib/deviceLogic/JsonDeviceLogic.js
       │    │    │    └─ lib/deviceLogic/BaseDeviceLogic.js
       │    │    └─ configs/device_logic.json
       │    ├─ lib/utils.js (SameKeytoMap)
       │    └─ lib/errors/
       ├─ lib/api/server.js
       │    ├─ configs/config_map.json  (讀/寫)
       │    ├─ configs/device_logic.json (讀/寫)
       │    ├─ configs/settings.json    (讀/寫)
       │    ├─ lib/configValidator.js
       │    └─ lib/deviceLogic/DeviceManager.js (.reload())
       └─ lib/logger/
```
