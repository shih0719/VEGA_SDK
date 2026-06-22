const mqtt = require("mqtt");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("../logger");
const { createError } = require("../errors");

class MqttService extends EventEmitter {
  constructor(config) {
    super();
    this.mqttConfig = config;
    this.mqttClient = null;
    this.isMQTTConnected = false;
  }

  start() {
    if (this.mqttClient && this.mqttClient.connected) {
      logger.warn("MQTT is already connected or connecting.");
      return;
    }

    logger.info(
      `MQTT reconnect period: ${this.mqttConfig.options.reconnectPeriod} ms`
    );

    this.mqttClient = mqtt.connect(
      this.mqttConfig.url,
      this.mqttConfig.options
    );

    this.mqttClient.on("connect", () => {
      this.isMQTTConnected = true;
      logger.info("MQTT connected to", this.mqttConfig.url);

      this.emit("connected");
    });

    this.mqttClient.on("message", (topic, message) => {
      logger.debug(`Received message from topic: ${topic}`);
      this.emit("message", topic, message);
    });

    this.mqttClient.on("error", (err) => {
      logger.error("MQTT connection error:", err);
      // 不再拋出錯誤，而是發出事件，讓 CoreService 處理
      this.emit(
        "error",
        createError("service", `MQTT connection error: ${err.message}`, 5003, {
          service: "MQTT",
          originalError: err,
        })
      );
    });

    this.mqttClient.on("reconnect", () => {
      logger.warn(`MQTT client is trying to reconnect.`);
    });

    this.mqttClient.on("close", () => {
      logger.info("MQTT connection closed");
      this.isMQTTConnected = false;
      this.emit("disconnected");
    });
  }

  subscribe(topic) {
    if (!this.isMQTTConnected) {
      throw new Error("MQTT is not connected.");
    }
    this.mqttClient.subscribe(topic);
    logger.info(`Subscribed to topic: ${topic}`);
  }

  publish(topic, message) {
    if (!this.isMQTTConnected) {
      throw new Error("MQTT is not connected.");
    }
    this.mqttClient.publish(topic, message);
    logger.info(`Published topic: ${topic}`);
    logger.info(`Published message: ${message}`);
  }

  stop() {
    if (!this.isMQTTConnected) {
      throw new Error("MQTT is not connected.");
    }
    this.mqttClient.end(true, () => {
      this.isMQTTConnected = false;
      logger.info("MQTT disconnected");
      this.emit("disconnected");
    });
  }

  isRunning() {
    return this.isMQTTConnected;
  }
}

module.exports = MqttService;
