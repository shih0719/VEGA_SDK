/**
 * 基礎錯誤類，所有自定義錯誤都應該繼承此類
 */
class BaseError extends Error {
  /**
   * @param {string} message - 錯誤信息
   * @param {number} code - 錯誤代碼
   */
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 獲取錯誤的 JSON 表示
   * @returns {Object} 錯誤的 JSON 對象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

module.exports = BaseError;
