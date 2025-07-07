const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError } = require("../errors");

/**
 * @description 面板設備的讀寫邏輯
 */
class PanelLogic extends BaseDeviceLogic {
  constructor() {
    super();
    this.deviceType = "panel";
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
          'Invalid panel data format: missing or invalid "function" object.',
          4009,
          { deviceType: this.deviceType }
        );
      }
      return true;
    } catch (error) {
      this.logger.error(`PanelLogic validation failed: ${error.message}`);
      if (error instanceof createError) {
        throw error;
      }
      throw createError(
        "device",
        `PanelLogic: Invalid JSON format or data structure.`,
        4010,
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
        case "switch_ch1":
          rs[key] = value ? 1 : 0;
          break;
        case "button_id":
          if (typeof value === "number") {
            rs[key] = value * 10;
          } else {
            this.logger.warn(
              `PanelLogic: Invalid number for button_id: "${value}".`
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
      case "switch_ch1":
        transformedValue = value === 1;
        break;
      case "button_id":
        // 這裡假設 button_id 寫入時不需要特殊轉換，直接使用原始值
        // 如果有特定需求，可以在此處添加邏輯
        break;
      default:
        this.logger.warn(
          `PanelLogic: Writing to unhandled channel "${channel}" with value "${value}".`
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

module.exports = PanelLogic;
