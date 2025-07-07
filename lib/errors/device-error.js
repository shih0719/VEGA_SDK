const BaseError = require("./base-error");

/**
 * 設備相關錯誤
 */
class DeviceError extends BaseError {
  /**
   * @param {string} message - 錯誤信息
   * @param {number} code - 錯誤代碼
   * @param {string} deviceType - 設備類型
   */
  constructor(message, code, deviceType) {
    super(message, code);
    this.deviceType = deviceType;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      deviceType: this.deviceType,
    };
  }
}

// 錯誤代碼定義
DeviceError.CODES = {
  INVALID_DATA: 1001,
  PARSE_ERROR: 1002,
  INVALID_DEVICE_TYPE: 1003,
  TRANSFORMATION_ERROR: 1004,
};

module.exports = DeviceError;
