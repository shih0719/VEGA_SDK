const mqtt = require("mqtt");
const ModbusRTU = require("modbus-serial");
const defaultConfig = require("./config");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("./logger");
const { SameKeytoMap } = require("./utils");
const deviceManager = require("./deviceLogic/DeviceManager");
const { DeviceError, createError } = require("./errors");

class MQTTtoModbusSDK extends EventEmitter {
  constructor(config) {
    super();
    this.mqttConfig = config.mqtt || defaultConfig.mqtt;
    this.modbusConfig = config.modbus || defaultConfig.modbus;
    this.mapConfig = config.map || defaultConfig.map;
    this.reverseMapConfig = config.reverseMap || defaultConfig.reverseMap;
    this.mqttClient = null; // MQTT 連線對象
    this.modbusServer = null; // Modbus server
    this.isMQTTConnected = false;
    this.isModbusRunning = false;
    this.holdingRegisters = Array(100).fill(0);
    this.reconnectAttempts = 0; // 重新连接尝试次数
    // reconnect period 修改沒有影響到原始設定，需再修改
  }
  // 啟動 MQTT 連線
  startMQTT() {
    if (this.isMQTTConnected) {
      throw new Error("MQTT is already connected.");
    }
    const reconnectPeriod = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      60000
    ); // 最大等待时间为60秒
    this.mqttConfig.options.reconnectPeriod = reconnectPeriod;
    logger.info(`Reconnect period: ${reconnectPeriod} ms`);
    this.mqttClient = mqtt.connect(
      this.mqttConfig.url,
      this.mqttConfig.options
    );
    this.mqttClient.on("connect", () => {
      this.isMQTTConnected = true;
      this.reconnectAttempts = 0; // 重置重新连接尝试次数
      logger.info("MQTT connected to", this.mqttConfig.url);
      this.emit("mqttConnected");
      this.mapConfig.forEach((value, key) => {
        this.subscribe(key);
        logger.info(`auto Subscribed to topic: ${key}`);
      });
    });

    this.mqttClient.on("message", (topic, message) => {
      this._handleMQTTMessage(topic, message);
      logger.debug(`Received message from topic: ${topic}`);
    });

    this.mqttClient.on("error", (err) => {
      console.error("MQTT error:", err);
    });
    this.mqttClient.on("reconnect", () => {
      this.reconnectAttempts += 1;
      console.log(
        `MQTT client is trying to reconnect ${this.reconnectAttempts} times`
      );
      process.stdout.write(""); // 确保日志立即刷新
      this.updateReconnectPeriod(); // 更新重新连接时间
    });

    this.mqttClient.on("close", () => {
      console.log("MQTT connection closed");
    });
  }
  updateReconnectPeriod() {
    const reconnectPeriod = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      120000
    ); // 最大等待时间为2分钟
    this.mqttConfig.options.reconnectPeriod = reconnectPeriod;
    console.log(`Updated reconnect period: ${reconnectPeriod} ms`);
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

    this.mqttClient.end(true, () => {
      // force disconnect
      this.isMQTTConnected = false;
      logger.info("MQTT disconnected");
      this.emit("mqttDisconnected");
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
      logger.error("Modbus server error:", err);
      this.emit("modbusError", err);
    });

    logger.info(
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
      logger.info("Modbus server stopped");
      this.emit("modbusStopped");
    });
  }
  /**
   * 私有方法：處理 MQTT 讀取 "設備狀態訊息"
   * @param {string} topic - MQTT 主題
   * @param {Buffer} message - 接收到的訊息緩衝區
   * @returns {Map<string, any> | null} 轉換後的數據映射，如果主題未配置則返回 null
   */
  _handleMQTTMessage(topic, message) {
    if (this.mapConfig.has(topic)) {
      const { type, channels } = this.mapConfig.get(topic);
      try {
        const deviceLogic = deviceManager.getDeviceLogic(type);
        const decodedMessage = message.toString();
        const rs = deviceLogic.read(decodedMessage); // 使用新的 read 方法
        const r = SameKeytoMap(channels, rs);
        for (const [key, value] of r) {
          this._setHoldingRegister(key, value, "internal");
          logger.debug(`Key: ${key}, Value: ${value}`);
        }
        return r;
      } catch (error) {
        if (error instanceof DeviceError) {
          logger.error(
            `DeviceError processing MQTT message for topic ${topic}: ${error.message}`
          );
        } else {
          logger.error(
            `Unexpected error processing MQTT message for topic ${topic}: ${error.message}`
          );
        }
        this.emit("deviceError", error); // 發射設備錯誤事件
        return null;
      }
    } else {
      logger.debug(`MQTT topic "${topic}" not found in mapConfig.`);
      return null;
    }
  }

  /**
   * 私有方法：處理 Modbus 寫入 "設備控制指令"
   * @param {number} addr - Modbus 寄存器地址
   * @param {number} value - 要寫入的值
   * @returns {{topic: string, message: object} | null} 包含主題和訊息的對象，如果地址未配置則返回 null
   */
  _handleExternalWrite(addr, value) {
    if (this.reverseMapConfig.has(addr)) {
      const { topic, channel, type } = this.reverseMapConfig.get(addr);
      try {
        const deviceLogic = deviceManager.getDeviceLogic(type);
        const message = deviceLogic.write(channel, value); // 使用新的 write 方法
        return { topic, message };
      } catch (error) {
        if (error instanceof DeviceError) {
          logger.error(
            `DeviceError processing Modbus write for address ${addr}: ${error.message}`
          );
        } else {
          logger.error(
            `Unexpected error processing Modbus write for address ${addr}: ${error.message}`
          );
        }
        this.emit("deviceError", error); // 發射設備錯誤事件
        return null;
      }
    } else {
      logger.warn(`Modbus address "${addr}" not found in reverseMapConfig.`);
      return null;
    }
  }

  /**
   * Modbus 寫入回調，通知 MQTT 控制設備
   * @param {number} addr - Modbus 寄存器地址
   * @param {number} value - 要寫入的值
   * @param {string} [source='external'] - 寫入來源 ('external' | 'internal')
   */
  _setHoldingRegister(addr, value, source = "external") {
    if (source === "external") {
      const result = this._handleExternalWrite(addr, value);
      if (result) {
        const { topic, message } = result;
        this.mqttClient.publish(topic, JSON.stringify(message));
        logger.info(`Published topic: ${topic}`);
        logger.info(`Published message: ${JSON.stringify(message)}`);
        logger.debug(`External set ${addr} to ${value} from Modbus`);
      } else {
        logger.warn(
          `Failed to process external write for address ${addr}. No MQTT message published.`
        );
      }
    } else if (source === "internal") {
      // 內部修改邏輯
      logger.debug(`Internal set ${addr} to ${value} from MQTT`);
      this.holdingRegisters[addr] = value;
    }
  }
  _getHoldingRegister(addr) {
    // 獲取 Modbus 寄存器的值
    return this.holdingRegisters[addr] || 0;
  }
}

module.exports = MQTTtoModbusSDK;
