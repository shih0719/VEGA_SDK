const BaseError = require("./base-error");

/**
 * 服務相關錯誤
 */
class ServiceError extends BaseError {
  /**
   * @param {string} message - 錯誤信息
   * @param {number} code - 錯誤代碼
   * @param {string} serviceName - 服務名稱
   */
  constructor(message, code, serviceName) {
    super(message, code);
    this.serviceName = serviceName;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
    };
  }
}

// 錯誤代碼定義
ServiceError.CODES = {
  CONNECTION_ERROR: 2001,
  TIMEOUT_ERROR: 2002,
  CONFIGURATION_ERROR: 2003,
  OPERATION_ERROR: 2004,
};

module.exports = ServiceError;
