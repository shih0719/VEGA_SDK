const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError } = require("../errors");

/**
 * @description 人體存在感應器的讀邏輯
 */
class HPDLogic extends BaseDeviceLogic {
  constructor() {
    super();
    this.deviceType = "HPD";
  }

  /**
   * @override
   * @protected
   * @param {string} data - 原始數據字符串
   * @returns {boolean} 如果數據有效返回 true，否則拋出 DeviceError
   * @throws {DeviceError} 如果數據無效
   */
  validateData(data) {
    try {
      const jsonData = JSON.parse(data);
      if (
        !jsonData ||
        typeof jsonData !== "object" ||
        !jsonData.function ||
        typeof jsonData.function !== "object"
      ) {
        throw createError(
          "device",
          'Invalid aircondition data format: missing or invalid "function" object.',
          4004,
          { deviceType: this.deviceType }
        );
      }
      return true;
    } catch (error) {
      this.logger.error(
        `AirConditionLogic validation failed: ${error.message}`
      );
      if (error instanceof createError) {
        throw error;
      }
      throw createError(
        "device",
        `AirConditionLogic: Invalid JSON format or data structure.`,
        4005,
        { deviceType: this.deviceType }
      );
    }
  }

  /**
   * @override
   * @protected
   * @param {object} data - 解析後的數據對象 (包含 function 屬性)
   * @returns {Record<string, any>} 轉換後的讀取記錄
   * @throws {DeviceError} 如果轉換失敗
   */
  transformRead(data) {
    const func = data.function;
    const rs = {};

    for (const key in func) {
      let value = func[key];
      switch (key) {
        case "people":
          rs[key] = value ? 1 : 0;
          break;
        case "temperature":
          if (typeof value === "number") {
            rs[key] = value * 10; // 溫度值需要乘以10
          } else {
            this.logger.warn(
              `HumanPresenceDeviceLogic: Unknown temperature value "${value}".`
            );
            rs[key] = value;
          }
          break;
        case "illumination":
          if (typeof value === "number") {
            rs[key] = value;
          } else {
            this.logger.warn(
              `HumanPresenceDeviceLogic: Unknown illumination value "${value}".`
            );
            rs[key] = value;
          }
          break;
        default:
          rs[key] = value;
          break;
      }
    }
    return rs;
  }
}

module.exports = HPDLogic;
