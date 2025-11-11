const { defaultLogger: logger } = require("../logger"); // 引入 logger

// 確保在 pkg 打包的執行檔中 NODE_ENV 被正確設定
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development"; // 預設為開發環境
  logger.info("NODE_ENV 未設定，預設為開發環境。");
} else {
  logger.info(`在${process.env.NODE_ENV}模式下執行。`);
}
const mqtt2modbus = require("../core");
const config = require("../config"); // 引入配置文件
const Service = new mqtt2modbus(config);
Service.start(); // 啟動服務
