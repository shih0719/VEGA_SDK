const fs = require("fs");
const path = require("path");

/**
 * 日誌級別枚舉
 * @enum {number}
 */
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * 進階日誌系統
 */
class Logger {
  /**
   * @param {Object} options - 日誌配置選項
   * @param {string} options.logPath - 日誌文件路徑
   * @param {LogLevel} options.level - 日誌級別
   * @param {boolean} options.console - 是否同時輸出到控制台
   * @param {boolean} options.timestamp - 是否包含時間戳
   */
  constructor(options = {}) {
    this.logPath =
      options.logPath || path.join(process.cwd(), "logs", "app.log");
    this.level = options.level || LogLevel.INFO;
    this.console = options.console !== false;
    this.timestamp = options.timestamp !== false;
    this.file = options.file !== false;

    // 確保日誌目錄存在
    if (this.file) {
      const logDir = path.dirname(this.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * 寫入日誌
   * @private
   * @param {LogLevel} level - 日誌級別
   * @param {string} message - 日誌信息
   */
  _log(level, message) {
    if (level > this.level) return;

    const timestamp = this.timestamp
      ? new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
      : "";
    const levelStr = Object.keys(LogLevel)[level];
    const logMessage = `${timestamp} [${levelStr}] ${message}\n`;

    if (this.file) {
      // 檢查是否需要輪替日誌檔案
      this.rotate();

      fs.appendFile(this.logPath, logMessage, (err) => {
        if (err) {
          console.error("Failed to write log:", err);
        }
      });
    }

    // 輸出到控制台
    if (this.console) {
      const consoleMethod =
        level === LogLevel.ERROR
          ? "error"
          : level === LogLevel.WARN
          ? "warn"
          : level === LogLevel.DEBUG
          ? "debug"
          : "log";
      console[consoleMethod](logMessage.trim());
    }
  }

  /**
   * 記錄錯誤信息
   * @param {string | Error} message - 錯誤信息或錯誤對象
   * @param {Error | object} [err] - 附加的錯誤物件，優先印出其 stack；
   *   若帶有 toJSON()（如自訂錯誤類別）則一併印出結構化欄位
   */
  error(message, err) {
    if (message instanceof Error) {
      this._log(LogLevel.ERROR, `${message.message}\n${message.stack}`);
      return;
    }
    if (err instanceof Error) {
      const details =
        typeof err.toJSON === "function" ? ` ${JSON.stringify(err.toJSON())}` : "";
      this._log(LogLevel.ERROR, `${message}\n${err.stack}${details}`);
    } else if (err !== undefined) {
      this._log(LogLevel.ERROR, `${message} ${JSON.stringify(err)}`);
    } else {
      this._log(LogLevel.ERROR, message);
    }
  }

  /**
   * 記錄警告信息
   * @param {string} message - 警告信息
   * @param {Error | object} [err] - 附加的錯誤物件或詳情
   */
  warn(message, err) {
    if (err instanceof Error) {
      this._log(LogLevel.WARN, `${message}\n${err.stack}`);
    } else if (err !== undefined) {
      this._log(LogLevel.WARN, `${message} ${JSON.stringify(err)}`);
    } else {
      this._log(LogLevel.WARN, message);
    }
  }

  /**
   * 記錄一般信息
   * @param {string} message - 一般信息
   */
  info(message) {
    this._log(LogLevel.INFO, message);
  }

  /**
   * 記錄調試信息
   * @param {string} message - 調試信息
   */
  debug(message) {
    this._log(LogLevel.DEBUG, message);
  }

  /**
   * 設置日誌級別
   * @param {LogLevel} level - 新的日誌級別
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * 清理日誌文件
   */
  async clear() {
    try {
      await fs.promises.writeFile(this.logPath, "");
    } catch (error) {
      console.error("Failed to clear log file:", error);
    }
  }
  /**
   * 檢查並輪替日誌檔案（依大小或日期）
   * @param {number} maxSize - 最大檔案大小（bytes）
   * @param {number} maxFiles - 最多保留檔案數
   */
  rotate(maxSize = 5 * 1024 * 1024, maxFiles = 5) {
    try {
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath);
        if (stats.size > maxSize) {
          const logDir = path.dirname(this.logPath);
          const baseName = path.basename(this.logPath, ".log");
          const newName = path.join(logDir, `${baseName}_${Date.now()}.log`);
          fs.renameSync(this.logPath, newName);

          // 清理舊檔案，只保留最新 maxFiles 個
          const files = fs
            .readdirSync(logDir)
            .filter((f) => f.startsWith(baseName + "_") && f.endsWith(".log"))
            .sort(
              (a, b) =>
                fs.statSync(path.join(logDir, b)).mtimeMs -
                fs.statSync(path.join(logDir, a)).mtimeMs
            );
          files.slice(maxFiles).forEach((f) => {
            fs.unlinkSync(path.join(logDir, f));
          });
        }
      }
    } catch (err) {
      console.error("Log rotation failed:", err);
    }
  }
}

// 導出
module.exports = {
  Logger,
  LogLevel,
};
