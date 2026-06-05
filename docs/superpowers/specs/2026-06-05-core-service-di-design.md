# CoreService 依賴注入設計

**日期：** 2026-06-05  
**範圍：** Scope A — 僅改 CoreService，DeviceManager singleton 暫時保留

---

## 問題

CoreService 在 constructor 內硬 new MqttService 和 ModbusService，並直接 require DeviceManager singleton。導致：

- 無法在不啟動真實 MQTT broker / Modbus port 的情況下測試 CoreService
- 測試必須依賴外部網路和 port，無法隔離
- 依賴隱藏在實作內，介面說謊

---

## 設計

### CoreService constructor 簽名

```js
constructor(config, services)
```

`services` 為必填物件，shape：

```js
{
  mqttService:   EventEmitter,  // 需實作 start(), stop(), subscribe(), publish(), on()
  modbusService: EventEmitter,  // 需實作 start(), stop(), setInternalHoldingRegister(), on()
  deviceManager: object         // 需實作 getDeviceLogic(type)
}
```

若 `services` 未傳，丟出明確錯誤（不提供預設值）。

### CoreService 內部變更

- 移除 `new MqttService(...)` 和 `new ModbusService(...)`
- 移除 `require('./deviceLogic/DeviceManager')`（module-level）
- 改用 `this.mqttService = services.mqttService` 等
- holding_registers 的 fs I/O 保留不動（Scope A）

### 呼叫端 lib/cmd/cli.js

cli.js 負責組裝，改成：

```js
const config = require('../config');
const MqttService = require('../services/MqttService');
const ModbusService = require('../services/ModbusService');
const deviceManager = require('../deviceLogic/DeviceManager');

const mqttService = new MqttService(config.mqtt);

// holding_registers 載入邏輯從 CoreService 移出，在 cli.js 做
const holdingRegisters = loadHoldingRegisters(); // 抽成 helper

const modbusService = new ModbusService(
  config.modbus,
  holdingRegisters,
  saveHoldingRegisters  // callback 保留
);

const core = new CoreService(config, {
  mqttService,
  modbusService,
  deviceManager,
});
```

> 注意：holding_registers 的 loadHoldingRegisters / saveHoldingRegisters 邏輯從 CoreService constructor 移到 cli.js，CoreService 透過 services.modbusService 的 callback 機制間接觸發存檔（不改變現有 ModbusService 介面）。

### 測試時

```js
const fakeMqtt = new EventEmitter();
fakeMqtt.start = async () => {};
fakeMqtt.stop  = async () => {};
fakeMqtt.subscribe = () => {};
fakeMqtt.publish   = () => {};

const fakeModbus = new EventEmitter();
fakeModbus.start = async () => {};
fakeModbus.stop  = async () => {};
fakeModbus.setInternalHoldingRegister = () => {};

const fakeDeviceManager = {
  getDeviceLogic: (type) => ({ read: () => ({}), write: () => ({}) })
};

const core = new CoreService(config, {
  mqttService: fakeMqtt,
  modbusService: fakeModbus,
  deviceManager: fakeDeviceManager,
});
```

---

## 變更檔案

| 檔案 | 變更 |
|---|---|
| [lib/core.js](../../../lib/core.js) | 移除硬編碼 new，改用 services 參數 |
| [lib/cmd/cli.js](../../../lib/cmd/cli.js) | 新增組裝邏輯，傳入 services |

---

## 不變動

- DeviceManager singleton（`module.exports = new DeviceManager()`）
- MqttService / ModbusService 內部實作
- holding_registers 的 fs I/O 邏輯（搬到 cli.js，邏輯不變）
- API server
