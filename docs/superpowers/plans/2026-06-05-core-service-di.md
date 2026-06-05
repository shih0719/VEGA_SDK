# CoreService 依賴注入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 CoreService 接受注入的 mqttService、modbusService、deviceManager，不再在 constructor 內硬 new 依賴，使 CoreService 可在不啟動真實網路服務的情況下被測試。

**Architecture:** 修改 CoreService constructor 簽名為 `(config, services)`，services 為必填；將 holding_registers 的載入邏輯移到 cli.js；cli.js 負責組裝所有服務後傳入 CoreService。

**Tech Stack:** Node.js, EventEmitter, Jest（測試）

---

## 檔案清單

| 動作 | 路徑 | 說明 |
|---|---|---|
| 修改 | `lib/core.js` | 移除硬編碼 new，改用 services 參數 |
| 修改 | `lib/cmd/cli.js` | 新增組裝邏輯，傳入 services |
| 新增 | `tests/core.test.js` | CoreService 單元測試 |

---

### Task 1: 安裝 Jest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安裝 Jest**

```bash
npm install --save-dev jest
```

- [ ] **Step 2: 在 package.json 加入 test script**

在 `package.json` 的 `scripts` 區塊加入：

```json
"test": "jest"
```

- [ ] **Step 3: 確認 Jest 可執行**

```bash
npm test -- --listTests
```

Expected: 無錯誤（目前無測試檔，輸出空列表或提示 no test files）

---

### Task 2: 寫 CoreService 的失敗測試

**Files:**
- Create: `tests/core.test.js`

- [ ] **Step 1: 建立測試檔，寫第一個失敗測試**

建立 `tests/core.test.js`：

```js
const EventEmitter = require('events');
const CoreService = require('../lib/core');

function makeFakeServices() {
  const mqttService = new EventEmitter();
  mqttService.start = jest.fn().mockResolvedValue(undefined);
  mqttService.stop  = jest.fn().mockResolvedValue(undefined);
  mqttService.subscribe = jest.fn();
  mqttService.publish   = jest.fn();

  const modbusService = new EventEmitter();
  modbusService.start = jest.fn().mockResolvedValue(undefined);
  modbusService.stop  = jest.fn().mockResolvedValue(undefined);
  modbusService.setInternalHoldingRegister = jest.fn();

  const deviceManager = {
    getDeviceLogic: jest.fn().mockReturnValue({
      read:  () => ({}),
      write: () => ({}),
    }),
  };

  return { mqttService, modbusService, deviceManager };
}

const fakeConfig = {
  mqtt:       { broker: 'mqtt://localhost' },
  modbus:     { host: '0.0.0.0', port: 502 },
  map:        new Map(),
  reverseMap: new Map(),
};

describe('CoreService DI', () => {
  test('constructor 未傳 services 時丟出錯誤', () => {
    expect(() => new CoreService(fakeConfig)).toThrow();
  });

  test('constructor 傳入 services 後可正常建立', () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    expect(core).toBeInstanceOf(CoreService);
  });

  test('start() 呼叫 mqttService.start 和 modbusService.start', async () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    await core.start();
    expect(services.mqttService.start).toHaveBeenCalledTimes(1);
    expect(services.modbusService.start).toHaveBeenCalledTimes(1);
  });

  test('stop() 呼叫 mqttService.stop 和 modbusService.stop', async () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    await core.stop();
    expect(services.mqttService.stop).toHaveBeenCalledTimes(1);
    expect(services.modbusService.stop).toHaveBeenCalledTimes(1);
  });

  test('MQTT message 觸發 deviceManager.getDeviceLogic', () => {
    const topic = 'device/sensor1';
    const channels = { temp: 100 };
    const config = {
      ...fakeConfig,
      map: new Map([[topic, { type: 'sensor', channels }]]),
    };
    const services = makeFakeServices();
    const core = new CoreService(config, services);
    services.mqttService.emit('message', topic, Buffer.from('{"temp":25}'));
    expect(services.deviceManager.getDeviceLogic).toHaveBeenCalledWith('sensor');
  });
});
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
npm test
```

Expected: 多個 FAIL，因為 CoreService 還不接受 services 參數

---

### Task 3: 修改 CoreService 接受 services 參數

**Files:**
- Modify: `lib/core.js`

- [ ] **Step 1: 修改 constructor**

將 `lib/core.js` 的 constructor 從：

```js
constructor(config) {
  super();
  this.config = config;
  this.mqttConfig = config.mqtt || defaultConfig.mqtt;
  this.modbusConfig = config.modbus || defaultConfig.modbus;
  this.mapConfig = config.map || defaultConfig.map;
  this.reverseMapConfig = config.reverseMap || defaultConfig.reverseMap;
  // ... fs 讀取 holdingRegisters ...
  this.mqttService = new MqttService(this.mqttConfig);
  this.modbusService = new ModbusService(
    this.modbusConfig,
    this.holdingRegisters,
    this.saveHoldingRegisters.bind(this)
  );
  this._setupEventListeners();
}
```

改為：

```js
constructor(config, services) {
  super();
  if (!services || !services.mqttService || !services.modbusService || !services.deviceManager) {
    throw new Error('CoreService requires services: { mqttService, modbusService, deviceManager }');
  }
  this.config = config;
  this.mapConfig = config.map || defaultConfig.map;
  this.reverseMapConfig = config.reverseMap || defaultConfig.reverseMap;
  this.mqttService    = services.mqttService;
  this.modbusService  = services.modbusService;
  this.deviceManager  = services.deviceManager;
  this._setupEventListeners();
}
```

- [ ] **Step 2: 移除 module-level require 中不再需要的項目**

在 `lib/core.js` 頂端，移除以下兩行：

```js
const MqttService = require("./services/MqttService");
const ModbusService = require("./services/ModbusService");
```

以及：

```js
const deviceManager = require("./deviceLogic/DeviceManager");
```

- [ ] **Step 3: 將 _handleMQTTMessage 中的 deviceManager 改用 this.deviceManager**

找到第 144 行：

```js
const deviceLogic = deviceManager.getDeviceLogic(type);
```

改為：

```js
const deviceLogic = this.deviceManager.getDeviceLogic(type);
```

- [ ] **Step 4: 將 _handleExternalWrite 中的 deviceManager 改用 this.deviceManager**

找到第 181 行：

```js
const deviceLogic = deviceManager.getDeviceLogic(type);
```

改為：

```js
const deviceLogic = this.deviceManager.getDeviceLogic(type);
```

- [ ] **Step 5: 移除 saveHoldingRegisters 方法和相關 fs 程式碼**

移除 constructor 中讀取 holding_registers 的 try/catch 區塊（原 lines 25-36）。

移除 `saveHoldingRegisters()` 方法（原 lines 226-236）。

移除頂端的 `const fs = require("fs")` 和 `const path = require("path")` 以及 `HOLDING_REGISTERS_FILE` 常數（若其他地方不使用）。

- [ ] **Step 6: 執行測試，確認通過**

```bash
npm test
```

Expected: 所有 tests PASS

- [ ] **Step 7: Commit**

```bash
git add lib/core.js tests/core.test.js
git commit -m "refactor: CoreService accepts injected services via constructor"
```

---

### Task 4: 更新 cli.js 負責組裝服務

**Files:**
- Modify: `lib/cmd/cli.js`

- [ ] **Step 1: 在 cli.js 加入 holding_registers 載入邏輯並組裝服務**

將 `lib/cmd/cli.js` 頂端的：

```js
const mqtt2modbus = require("../core");
const config = require("../config");
const { createUIServer } = require("../api/server");
const Service = new mqtt2modbus(config);
```

改為：

```js
const fs = require("fs");
const path = require("path");
const CoreService = require("../core");
const config = require("../config");
const { createUIServer } = require("../api/server");
const MqttService = require("../services/MqttService");
const ModbusService = require("../services/ModbusService");
const deviceManager = require("../deviceLogic/DeviceManager");

const HOLDING_REGISTERS_FILE = path.join(__dirname, "../../configs/holding_registers.json");

function loadHoldingRegisters() {
  try {
    if (fs.existsSync(HOLDING_REGISTERS_FILE)) {
      const data = fs.readFileSync(HOLDING_REGISTERS_FILE, "utf8");
      logger.info("Loaded holdingRegisters from file.");
      return JSON.parse(data);
    }
  } catch (err) {
    logger.warn("Failed to load holdingRegisters, using default.", err);
  }
  return Array(300).fill(0);
}

function saveHoldingRegisters(registers) {
  try {
    fs.writeFileSync(HOLDING_REGISTERS_FILE, JSON.stringify(registers));
    logger.info("holdingRegisters saved to file.");
  } catch (err) {
    logger.error("Failed to save holdingRegisters.", err);
  }
}

const holdingRegisters = loadHoldingRegisters();
const mqttService   = new MqttService(config.mqtt);
const modbusService = new ModbusService(
  config.modbus,
  holdingRegisters,
  () => saveHoldingRegisters(holdingRegisters)
);

const Service = new CoreService(config, { mqttService, modbusService, deviceManager });
```

> 注意：`logger` 已在 cli.js 頂端被 require，不需重複引入。

- [ ] **Step 2: 手動驗證 cli.js 可啟動**

```bash
npm run dev
```

Expected: 服務正常啟動，MQTT 和 Modbus 連線，無錯誤訊息

- [ ] **Step 3: Ctrl+C 結束，確認優雅關閉正常**

Expected: 出現「腳本已優雅關閉」訊息

- [ ] **Step 4: 執行測試確認未破壞任何測試**

```bash
npm test
```

Expected: 所有 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cmd/cli.js
git commit -m "refactor: cli.js assembles and injects services into CoreService"
```

---

## 完成標準

- [ ] `npm test` 全部 PASS
- [ ] `npm run dev` 服務正常啟動
- [ ] `lib/core.js` 不含任何 `new MqttService`、`new ModbusService`、`require('./deviceLogic/DeviceManager')`
- [ ] CoreService constructor 傳入空 services 時丟出明確錯誤
