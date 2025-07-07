const BaseError = require("./base-error");
const DeviceError = require("./device-error");
const ServiceError = require("./service-error");
const ConfigError = require("./config-error");

/**
 * 錯誤處理模組
 * @module errors
 */
module.exports = {
  BaseError,
  DeviceError,
  ServiceError,
  ConfigError,
};

/**
 * 檢查是否為自定義錯誤
 * @param {Error} error - 要檢查的錯誤對象
 * @returns {boolean} 如果是自定義錯誤返回 true
 */
module.exports.isCustomError = (error) => {
  return error instanceof BaseError;
};

/**
 * 創建適當的錯誤對象
 * @param {string} type - 錯誤類型 ('device' | 'service' | 'config')
 * @param {string} message - 錯誤信息
 * @param {number} code - 錯誤代碼
 * @param {object} details - 額外的錯誤詳情
 * @returns {BaseError} 對應的錯誤對象
 */
module.exports.createError = (type, message, code, details = {}) => {
  switch (type.toLowerCase()) {
    case "device":
      return new DeviceError(message, code, details.deviceType);
    case "service":
      return new ServiceError(message, code, details.serviceName);
    case "config":
      return new ConfigError(message, code, details.configPath);
    default:
      return new BaseError(message, code);
  }
};
