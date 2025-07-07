const { DeviceError, createError } = require("../errors");
const { defaultLogger: logger } = require("../logger");

/**
 * @interface IDeviceLogic
 * @description 定義設備邏輯層的介面
 */
class IDeviceLogic {
  /**
   * 從原始數據讀取並轉換為結構化記錄
   * @param {string} data - 原始數據字符串
   * @returns {Record<string, any>} 轉換後的記錄
   * @throws {DeviceError} 如果數據無效或轉換失敗
   */
  read(data) {
    throw new Error('Method "read()" must be implemented.');
  }

  /**
   * 將通道和值轉換為寫入設備所需的對象
   * @param {string} channel - 通道名稱
   * @param {number} value - 要寫入的值
   * @returns {object} 轉換後的寫入對象
   * @throws {DeviceError} 如果通道或值無效
   */
  write(channel, value) {
    throw new Error('Method "write()" must be implemented.');
  }
}

/**
 * @abstract
 * @class BaseDeviceLogic
 * @implements {IDeviceLogic}
 * @description 設備邏輯的抽象基類，提供通用的數據處理和錯誤處理機制。
 */
class BaseDeviceLogic extends IDeviceLogic {
  constructor() {
    super();
    if (new.target === BaseDeviceLogic) {
      throw new TypeError(
        "Cannot construct BaseDeviceLogic instances directly."
      );
    }
    this.logger = logger;
  }

  /**
   * @protected
   * @abstract
   * @param {string} data - 原始數據字符串
   * @returns {boolean} 如果數據有效返回 true，否則拋出 DeviceError
   * @throws {DeviceError} 如果數據無效
   */
  validateData(data) {
    throw new Error(
      'Abstract method "validateData()" must be implemented by subclasses.'
    );
  }

  /**
   * @protected
   * @param {string} data - JSON 字符串
   * @returns {object} 解析後的 JSON 對象
   * @throws {DeviceError} 如果 JSON 解析失敗
   */
  parseJSON(data) {
    try {
      const jsonData = JSON.parse(data);
      if (!jsonData || typeof jsonData !== "object") {
        throw createError(
          "device",
          "Parsed JSON data is not a valid object.",
          4001
        );
      }
      return jsonData;
    } catch (error) {
      this.logger.error(`Failed to parse JSON data: ${error.message}`);
      if (error instanceof DeviceError) {
        throw error;
      }
      throw createError(
        "device",
        `Invalid JSON format: ${error.message}`,
        4000
      );
    }
  }

  /**
   * @protected
   * @abstract
   * @param {object} data - 解析後的數據對象
   * @returns {Record<string, any>} 轉換後的讀取記錄
   * @throws {DeviceError} 如果轉換失敗
   */
  transformRead(data) {
    throw new Error(
      'Abstract method "transformRead()" must be implemented by subclasses.'
    );
  }

  /**
   * @protected
   * @abstract
   * @param {string} channel - 通道名稱
   * @param {number} value - 要寫入的值
   * @returns {object} 轉換後的寫入對象
   * @throws {DeviceError} 如果轉換失敗
   */
  transformWrite(channel, value) {
    throw new Error(
      'Abstract method "transformWrite()" must be implemented by subclasses.'
    );
  }

  /**
   * 實現 IDeviceLogic 的 read 方法
   * @param {string} data - 原始數據字符串
   * @returns {Record<string, any>} 轉換後的記錄
   * @throws {DeviceError} 如果數據無效或轉換失敗
   */
  read(data) {
    try {
      this.validateData(data);
      const parsedData = this.parseJSON(data);
      return this.transformRead(parsedData);
    } catch (error) {
      this.logger.error(`Error during device read operation: ${error.message}`);
      if (error instanceof DeviceError) {
        throw error;
      }
      throw createError(
        "device",
        `Failed to read device data: ${error.message}`,
        4002
      );
    }
  }

  /**
   * 實現 IDeviceLogic 的 write 方法
   * @param {string} channel - 通道名稱
   * @param {number} value - 要寫入的值
   * @returns {object} 轉換後的寫入對象
   * @throws {DeviceError} 如果通道或值無效
   */
  write(channel, value) {
    try {
      return this.transformWrite(channel, value);
    } catch (error) {
      this.logger.error(
        `Error during device write operation: ${error.message}`
      );
      if (error instanceof DeviceError) {
        throw error;
      }
      throw createError(
        "device",
        `Failed to write device data: ${error.message}`,
        4003
      );
    }
  }
}

module.exports = BaseDeviceLogic;
