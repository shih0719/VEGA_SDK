const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError } = require("../errors");

/**
 * @description 大計量遙控開關的讀邏輯
 */
class MeterLogic extends BaseDeviceLogic {
  constructor() {
    super();
    this.deviceType = "Meter";
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
        case "electricity":
          if (typeof value === "number") {
            const scaledValue = value * 100; // 電量值需要乘以100
            // 將 32-bit 數值分解為兩個 16-bit register
            rs[`${key}_high`] = (scaledValue >>> 16) & 0xffff; // 高位 16-bit
            rs[`${key}_low`] = scaledValue & 0xffff; // 低位 16-bit
          } else {
            this.logger.warn(
              `MeterLogic: Unknown electricity value "${value}".`
            );
            rs[`${key}_high`] = 0;
            rs[`${key}_low`] = 0;
          }
          break;
        case "current":
          if (typeof value === "number") {
            rs[key] = value * 1000; // 電流值需要乘以1000
          } else {
            this.logger.warn(`MeterLogic: Unknown current value "${value}".`);
            rs[key] = 0;
          }
          break;
        case "power":
          if (typeof value === "number") {
            const scaledValue = value * 10000; // 功率值需要乘以10000
            rs[`${key}_high`] = (scaledValue >>> 16) & 0xffff; // 高位 16-bit
            rs[`${key}_low`] = scaledValue & 0xffff; // 低位 16-bit
          } else {
            this.logger.warn(`MeterLogic: Unknown power value "${value}".`);
            rs[`${key}_high`] = 0;
            rs[`${key}_low`] = 0;
          }
          break;
        case "voltage":
          if (typeof value === "number") {
            rs[key] = value * 10; // 電壓值需要乘以10
          } else {
            this.logger.warn(`MeterLogic: Unknown voltage value "${value}".`);
            rs[key] = value;
          }
          break;
        case "switch_ch1":
          rs[key] = value ? 1 : 0;
          break;
        default:
          rs[key] = value;
          break;
      }
    }
    return rs;
  }
  transformWrite(channel, value) {
    let transformedValue = value;
    switch (channel) {
      case "switch_ch1":
        transformedValue = value === 1;
        break;
      case "set_init_electricity":
        if (typeof value === "number") {
          // 只有當寫入值為1時才執行重設（寫入0），其他數值不動作
          if (value === 1) {
            transformedValue = 0; // 重設電量
          }
        } else {
          throw createError(
            "device",
            `MeterLogic: Invalid electricity value for write: ${value}`,
            4006,
            { deviceType: this.deviceType }
          );
        }
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

module.exports = MeterLogic;
