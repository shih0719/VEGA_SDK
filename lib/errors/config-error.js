const BaseError = require("./base-error");

/**
 * 配置相關錯誤
 */
class ConfigError extends BaseError {
  /**
   * @param {string} message - 錯誤信息
   * @param {number} code - 錯誤代碼
   * @param {string} configPath - 配置文件路徑
   */
  constructor(message, code, configPath) {
    super(message, code);
    this.configPath = configPath;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      configPath: this.configPath,
    };
  }
}

// 錯誤代碼定義
ConfigError.CODES = {
  INVALID_FORMAT: 3001,
  MISSING_REQUIRED: 3002,
  FILE_NOT_FOUND: 3003,
  VALIDATION_ERROR: 3004,
};

module.exports = ConfigError;
