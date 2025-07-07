const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError } = require("../errors");

/**
 * @description 空調設備的讀寫邏輯
 */
class AirConditionLogic extends BaseDeviceLogic {
  constructor() {
    super();
    this.deviceType = "aircondition";
    this.modelMap = {
      cold: 0,
      heat: 1,
      fan: 2,
      0: "cold",
      1: "heat",
      2: "fan",
    };
    this.revSpeedMap = {
      auto: 0,
      low: 1,
      middle: 2,
      high: 3,
      0: "auto",
      1: "low",
      2: "middle",
      3: "high",
    };
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
        case "model":
          if (this.modelMap[value] !== undefined) {
            rs[key] = this.modelMap[value];
          } else {
            this.logger.warn(
              `AirConditionLogic: Unknown model value "${value}".`
            );
            rs[key] = value; // 保留原始值或拋出錯誤
          }
          break;
        case "rev_speed":
          if (this.revSpeedMap[value] !== undefined) {
            rs[key] = this.revSpeedMap[value];
          } else {
            this.logger.warn(
              `AirConditionLogic: Unknown rev_speed value "${value}".`
            );
            rs[key] = value;
          }
          break;
        case "temperature":
        case "current_temp":
        case "humidness":
          if (typeof value === "number") {
            rs[key] = value * 10;
          } else {
            this.logger.warn(
              `AirConditionLogic: Invalid number for ${key}: "${value}".`
            );
            rs[key] = value;
          }
          break;
        case "power_on":
          rs[key] = value ? 1 : 0;
          break;
        default:
          rs[key] = value;
          break;
      }
    }
    return rs;
  }

  /**
   * @override
   * @protected
   * @param {string} channel - 通道名稱
   * @param {number} value - 要寫入的值
   * @returns {object} 轉換後的寫入對象
   * @throws {DeviceError} 如果轉換失敗
   */
  transformWrite(channel, value) {
    let transformedValue = value;
    switch (channel) {
      case "power_on":
        transformedValue = value === 1;
        break;
      case "model":
        if (this.modelMap[value] !== undefined) {
          transformedValue = this.modelMap[value];
        } else {
          throw createError(
            "device",
            `AirConditionLogic: Invalid model value for write: ${value}`,
            4006,
            { deviceType: this.deviceType }
          );
        }
        break;
      case "temperature":
        if (typeof value === "number") {
          transformedValue = Math.round(value * 0.1);
        } else {
          throw createError(
            "device",
            `AirConditionLogic: Invalid temperature value for write: ${value}`,
            4007,
            { deviceType: this.deviceType }
          );
        }
        break;
      case "rev_speed":
        if (this.revSpeedMap[value] !== undefined) {
          transformedValue = this.revSpeedMap[value];
        } else {
          throw createError(
            "device",
            `AirConditionLogic: Invalid rev_speed value for write: ${value}`,
            4008,
            { deviceType: this.deviceType }
          );
        }
        break;
      default:
        // 對於未明確處理的通道，直接使用原始值
        this.logger.warn(
          `AirConditionLogic: Writing to unhandled channel "${channel}" with value "${value}".`
        );
        break;
    }

    return {
      function: {
        [channel]: transformedValue,
      },
      cmd: "write",
      source: "vega-SDK",
    };
  }
}

module.exports = AirConditionLogic;
