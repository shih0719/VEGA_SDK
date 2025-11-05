const AirConditionLogic = require("./AirConditionLogic");
const PanelLogic = require("./PanelLogic");
const SwitchLogic = require("./SwitchLogic");
const HPDLogic = require("./HPDLogic");
const MeterLogic = require("./MeterLogic");
const { createError } = require("../errors");
const { defaultLogger: logger } = require("../logger");

/**
 * @class DeviceManager
 * @description 管理不同設備類型的邏輯實例，提供獲取設備邏輯的方法。
 */
class DeviceManager {
  constructor() {
    /**
     * @private
     * @type {Map<string, BaseDeviceLogic>}
     * @description 儲存設備類型與其對應邏輯實例的映射。
     */
    this.deviceLogics = new Map();
    this.logger = logger;

    // 註冊所有已實現的設備邏輯
    this.registerDeviceLogic("aircondition", AirConditionLogic);
    this.registerDeviceLogic("panel", PanelLogic);
    this.registerDeviceLogic("switch", SwitchLogic);
    this.registerDeviceLogic("HPD", HPDLogic);
    this.registerDeviceLogic("meter", MeterLogic);
  }

  /**
   * 註冊一個設備邏輯類別。
   * @param {string} type - 設備類型名稱 (例如 'aircondition', 'panel', 'switch')。
   * @param {function} LogicClass - 繼承自 BaseDeviceLogic 的設備邏輯類別。
   * @throws {Error} 如果 LogicClass 不是有效的類別或未繼承 BaseDeviceLogic。
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
    // 實例化並儲存，或者可以考慮延遲實例化
    this.deviceLogics.set(type, new LogicClass());
    this.logger.info(`Registered device logic for type: ${type}`);
  }

  /**
   * 根據設備類型獲取對應的設備邏輯實例。
   * @param {string} deviceType - 設備類型名稱。
   * @returns {BaseDeviceLogic} 對應的設備邏輯實例。
   * @throws {DeviceError} 如果找不到對應的設備邏輯。
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

// 導出單例模式的 DeviceManager
module.exports = new DeviceManager();
