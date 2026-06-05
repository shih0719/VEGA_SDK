const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError, isCustomError } = require("../errors");

/**
 * @description 開關設備的讀寫邏輯
 */
class SwitchLogic extends BaseDeviceLogic {
  constructor() {
    super();
    this.deviceType = "switch";
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
          'Invalid switch data format: missing or invalid "function" object.',
          4009,
          { deviceType: this.deviceType }
        );
      }
      return true;
    } catch (error) {
      this.logger.error(
        ` ${error.code} : SwitchLogic validation failed: ${error.message}`
      );
      if (isCustomError(error)) {
        throw error;
      }
      throw createError(
        "device",
        `switchLogic: Invalid JSON format or data structure.`,
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
    this.logger.debug(
      `SwitchLogic: Entering transformRead with data: ${JSON.stringify(data)}`
    );
    const func = data.function;
    const rs = {};

    for (const key in func) {
      rs[key] = func[key] ? 1 : 0;
    }
    this.logger.debug(
      `SwitchLogic: Exiting transformRead with result: ${JSON.stringify(rs)}`
    );
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
    // 假設開關設備的寫入值通常是布林值 (1/0 對應 true/false)
    if (typeof value === "number") {
      transformedValue = value === 1;
    } else {
      this.logger.warn(
        `SwitchLogic: Writing non-numeric value "${value}" to channel "${channel}".`
      );
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

module.exports = SwitchLogic;
