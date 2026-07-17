const { Logger, LogLevel } = require("./logger");
const path = require("path");

/**
 * 預定義的日誌配置
 * @type {Object.<string, Object>}
 */
const PRESET_CONFIGS = {
  development: {
    level: LogLevel.DEBUG,
    console: true,
    timestamp: true,
  },
  production: {
    level: LogLevel.INFO,
    console: false,
    timestamp: true,
    file: process.env.LOG_TO_FILE !== "false",
  },
  test: {
    level: LogLevel.ERROR,
    console: true,
    timestamp: false,
  },
};

/**
 * 創建一個日誌實例
 * @param {Object} options - 配置選項
 * @param {string} [options.preset] - 預設配置名稱 ('development' | 'production' | 'test')
 * @param {string} [options.name='app'] - 日誌文件名稱
 * @param {Object} [options.config={}] - 自定義配置（將覆蓋預設配置）
 * @returns {Logger} Logger 實例
 */
function createLogger(options = {}) {
  const { preset = "development", name = "app", config = {} } = options;

  // 合併配置
  const baseConfig = PRESET_CONFIGS[preset] || PRESET_CONFIGS.development;
  const finalConfig = {
    ...baseConfig,
    ...config,
  };

  // 根據環境設定日誌路徑
  const env = process.env.NODE_ENV || "development";
  let logDir;

  if (env === "production") {
    logDir = path.join(process.cwd(), "logs", "prod");
  } else {
    logDir = path.join(process.cwd(), "logs", "dev");
  }

  finalConfig.logPath = path.join(logDir, `${name}.log`);

  return new Logger(finalConfig);
}

/**
 * 預設的全局日誌實例
 * 在開發環境中使用 DEBUG 級別，在生產環境中使用 INFO 級別
 */
const defaultLogger = createLogger({
  preset: process.env.NODE_ENV === "production" ? "production" : "development",
});

module.exports = {
  Logger,
  LogLevel,
  defaultLogger,
};
