const defaultConfig = require("./config");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("./logger");
const { SameKeytoMap } = require("./utils");
const deviceManager = require("./deviceLogic/DeviceManager");
const { DeviceError, createError } = require("./errors");
const MqttService = require("./services/MqttService");
const ModbusService = require("./services/ModbusService");

class CoreService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.mqttConfig = config.mqtt || defaultConfig.mqtt;
    this.modbusConfig = config.modbus || defaultConfig.modbus;
    this.mapConfig = config.map || defaultConfig.map;
    this.reverseMapConfig = config.reverseMap || defaultConfig.reverseMap;
    this.holdingRegisters = Array(100).fill(0); // Modbus 保持寄存器

    this.mqttService = new MqttService(this.mqttConfig);
    this.modbusService = new ModbusService(
      this.modbusConfig,
      this.holdingRegisters
    );

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.mqttService.on("connected", () => {
      logger.info("CoreService: MQTT connected.");
      this.mapConfig.forEach((value, topic) => {
        this.mqttService.subscribe(topic);
      });
      this.emit("mqttConnected");
    });

    this.mqttService.on("message", (topic, message) => {
      this._handleMQTTMessage(topic, message);
    });

    this.mqttService.on("disconnected", () => {
      logger.info("CoreService: MQTT disconnected.");
      this.emit("mqttDisconnected");
    });

    this.mqttService.on("error", (err) => {
      logger.error("CoreService: MQTT error:", err);
      this.emit("error", err);
    });

    this.modbusService.on("started", () => {
      logger.info("CoreService: Modbus server started.");
      this.emit("modbusStarted");
    });

    this.modbusService.on("stopped", () => {
      logger.info("CoreService: Modbus server stopped.");
      this.emit("modbusStopped");
    });

    this.modbusService.on("error", (err) => {
      logger.error("CoreService: Modbus error:", err);
      this.emit("error", err);
    });

    this.modbusService.on("externalWriteRequest", (addr, value) => {
      this._handleExternalModbusWrite(addr, value);
    });
  }

  async start() {
    try {
      await this.mqttService.start();
      await this.modbusService.start();
      logger.info("CoreService: All services started.");
      this.emit("started");
    } catch (error) {
      logger.error("CoreService: Failed to start services:", error);
      this.emit(
        "error",
        createError(
          "service",
          `Failed to start CoreService: ${error.message}`,
          5000,
          { originalError: error }
        )
      );
      throw error;
    }
  }

  async stop() {
    try {
      await this.mqttService.stop();
      await this.modbusService.stop();
      logger.info("CoreService: All services stopped.");
      this.emit("stopped");
    } catch (error) {
      logger.error("CoreService: Failed to stop services:", error);
      this.emit(
        "error",
        createError(
          "service",
          `Failed to stop CoreService: ${error.message}`,
          5000,
          { originalError: error }
        )
      );
      throw error;
    }
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
          this.modbusService.setInternalHoldingRegister(key, value);
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
   */
  _handleExternalModbusWrite(addr, value) {
    const result = this._handleExternalWrite(addr, value);
    if (result) {
      this.mqttService.publish(result.topic, JSON.stringify(result.message));
      logger.info(
        `CoreService: Published topic: ${
          result.topic
        }, message: ${JSON.stringify(result.message)}`
      );
    } else {
      logger.warn(
        `CoreService: Failed to process external write for address ${addr}. No MQTT message published.`
      );
    }
  }
}

module.exports = CoreService;
