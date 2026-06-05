const fs = require("fs");
const path = require("path");
const JsonDeviceLogic = require("./JsonDeviceLogic");
const { createError } = require("../errors");
const { defaultLogger: logger } = require("../logger");

const DEVICE_LOGIC_CONFIG_PATH = path.resolve(
  __dirname,
  "../../configs/device_logic.json"
);

class DeviceManager {
  constructor() {
    /**
     * @private
     * @type {Map<string, BaseDeviceLogic>}
     */
    this.deviceLogics = new Map();
    this.logger = logger;

    this._loadFromConfig();
  }

  _loadFromConfig() {
    let configs;
    try {
      configs = JSON.parse(fs.readFileSync(DEVICE_LOGIC_CONFIG_PATH, "utf8"));
    } catch (err) {
      this.logger.error(`Failed to load device_logic.json: ${err.message}`);
      throw err;
    }

    this.deviceLogics.clear();
    for (const config of configs) {
      const instance = new JsonDeviceLogic(config);
      this.deviceLogics.set(config.deviceType, instance);
      this.logger.info(`Registered device logic for type: ${config.deviceType}`);
    }
  }

  reload() {
    this.logger.info("Reloading device logic from device_logic.json");
    this._loadFromConfig();
  }

  /**
   * @param {string} type
   * @param {function} LogicClass - 繼承自 BaseDeviceLogic 的類別（供外部自訂設備使用）
   */
  registerDeviceLogic(type, LogicClass) {
    if (
      typeof LogicClass !== "function" ||
      !Object.prototype.isPrototypeOf.call(
        require("./BaseDeviceLogic"),
        LogicClass
      )
    ) {
      this.logger.error(
        `Attempted to register invalid device logic class for type "${type}".`
      );
      throw new Error(`Invalid DeviceLogic class provided for type: ${type}`);
    }
    this.deviceLogics.set(type, new LogicClass());
    this.logger.info(`Registered device logic for type: ${type}`);
  }

  /**
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return Array.from(this.deviceLogics.keys());
  }

  /**
   * @param {string} deviceType
   * @returns {BaseDeviceLogic}
   */
  getDeviceLogic(deviceType) {
    const logic = this.deviceLogics.get(deviceType);
    if (!logic) {
      this.logger.error(`Device logic not found for type: ${deviceType}`);
      throw createError(
        "device",
        `Device logic not found for type: ${deviceType}`,
        4013,
        { deviceType }
      );
    }
    return logic;
  }
}

module.exports = new DeviceManager();
