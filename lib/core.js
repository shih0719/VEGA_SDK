const mqtt = require("mqtt");
const ModbusRTU = require("modbus-serial");
const EventEmitter = require("events");
const { Logger, SameKeytoMap } = require("./utils");

let mqttConfig, modbusConfig, mapConfig;
try {
  mqttConfig = require("./configs/mqttConfig");
  modbusConfig = require("./configs/modbusConfig");
  mapConfig = require("./configs/mapConfig");
} catch (error) {
  console.error("Failed to load configuration files:", error.message);
  process.exit(1);
}

let reverseMap = new Map();
for (let [topic, { type, channels }] of mapConfig) {
  topic = topic + "/command";
  for (const [channel, addr] of Object.entries(channels)) {
    reverseMap.set(addr, { topic, channel, type });
  }
}
class MQTTtoModbusSDK extends EventEmitter {
  constructor() {
    super();
    this.mqttConfig = mqttConfig;
    console.log(this.mqttConfig);
    this.modbusConfig = modbusConfig;
    this.mapConfig = mapConfig;
    this.reverseMapConfig = reverseMap;
    this.mqttClient = null; // MQTT 連線對象
    this.modbusServer = null; // Modbus server
    this.isMQTTConnected = false;
    this.isModbusRunning = false;
    this.holdingRegisters = Array(200).fill(0);
  }
  // 啟動 MQTT 連線
  startMQTT() {
    if (this.isMQTTConnected) {
      throw new Error("MQTT is already connected.");
    }

    this.mqttClient = mqtt.connect(
      this.mqttConfig.url,
      this.mqttConfig.options
    );
    this.mqttClient.on("connect", () => {
      this.isMQTTConnected = true;
      console.log("MQTT connected to", this.mqttConfig.url);
      this.emit("mqttConnected");
      this.mapConfig.forEach((value, key) => {
        this.subscribe(key);
        console.log(`auto Subscribed to topic: ${key}`);
      });
    });

    this.mqttClient.on("message", (topic, message) => {
      this._handleMQTTMessage(topic, message);
      console.log(`Received message from topic: ${topic}`);
    });

    this.mqttClient.on("error", (err) => {
      console.error("MQTT error:", err);
    });
    this.mqttClient.on("reconnect", () => {});

    this.mqttClient.on("close", () => {
      console.log("MQTT connection closed");
    });
  }

  subscribe(topic) {
    if (!this.isMQTTConnected) {
      throw new Error("MQTT is not connected.");
    }
    this.mqttClient.subscribe(topic);
  }
  // 停止 MQTT 連線
  stopMQTT() {
    if (!this.isMQTTConnected) {
      throw new Error("MQTT is not connected.");
    }

    this.mqttClient.end(() => {
      this.isMQTTConnected = false;
      console.log("MQTT disconnected");
    });
  }
  // 啟動 Modbus server
  startModbus() {
    if (this.isModbusRunning) {
      throw new Error("Modbus server is already running.");
    }

    this.modbusServer = new ModbusRTU.ServerTCP(
      {
        getHoldingRegister: this._getHoldingRegister.bind(this),
        setRegister: (addr, value) => this._setHoldingRegister(addr, value),
      },
      { host: this.modbusConfig.host, port: this.modbusConfig.port }
    );

    this.modbusServer.on("error", (err) => {
      console.error("Modbus server error:", err);
    });

    console.log(
      `Modbus server started on ${this.modbusConfig.host}:${this.modbusConfig.port}`
    );
    this.isModbusRunning = true;
  }
  // 停止 Modbus server
  stopModbus() {
    if (!this.isModbusRunning) {
      throw new Error("Modbus server is not running.");
    }

    this.modbusServer.close(() => {
      this.isModbusRunning = false;
      console.log("Modbus server stopped");
    });
  }
  //載入邏輯轉換模組(同名js檔案)
  _getLogicModule(deviceType) {
    try {
      return require(`./readDevice/${deviceType}.js`);
    } catch (error) {
      throw new Error(
        `Module for device type "${deviceType}" not found: ${error.message}`
      );
    }
  }
  _writeLogicModule(deviceType) {
    try {
      return require(`./writeDevice/${deviceType}.js`);
    } catch (error) {
      throw new Error(
        `Module for device type "${deviceType}" not found: ${error.message}`
      );
    }
  }
  // 私有方法：處理 讀取邏輯
  // MQTT讀取 "設備狀態訊息"
  _handleMQTTMessage(topic, message) {
    if (this.mapConfig.has(topic)) {
      const { type, channels } = this.mapConfig.get(topic);
      const logic = this._getLogicModule(type);
      const rs = logic.execute(message);
      const r = SameKeytoMap(channels, rs);
      for (const [key, value] of r) {
        this._setHoldingRegister(key, value, "internal");
        console.log(`Key: ${key}, Value: ${value}`);
      }
      return r;
    } else {
      // console.log("topic not found in this.mapConfig");
    }
  }
  // 私有方法：處理 寫入邏輯
  // Modbus讀取 "設備控制指令"
  _handleExternalWrite(addr, value) {
    if (this.reverseMapConfig.has(addr)) {
      const { topic, channel, type } = this.reverseMapConfig.get(addr);
      const logic = this._writeLogicModule(type);
      const message = logic.execute(channel, value);

      //console.log(JSON.stringify(message));
      return { topic, message };
    } else {
      console.log("addr not found in config.js");
    }
  }
  // Modbus寫入回調，通知MQTT控制設備
  _setHoldingRegister(addr, value, source = "external") {
    if (source === "external") {
      const { topic, message } = this._handleExternalWrite(addr, value);
      this.mqttClient.publish(topic, JSON.stringify(message));
      console.log(`Published topic : ${topic}`);
      console.log(`Published message : ${JSON.stringify(message)}`);
      console.log(`external set ${addr} to ${value} from Modbus`);
    } else if (source === "internal") {
      // 內部修改邏輯
      console.log(`internal set ${addr} to ${value} from MQTT`);
      this.holdingRegisters[addr] = value;
    }
  }
  _getHoldingRegister(addr) {
    // 獲取 Modbus 寄存器的值
    return this.holdingRegisters[addr] || 0;
  }
}

module.exports = MQTTtoModbusSDK;
