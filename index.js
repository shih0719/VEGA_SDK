const { default: handle } = require("mqtt/lib/handlers/index");
const mqtt2modbus = require("./lib/core");
const { logger } = require("./lib/utils");
const fs = require("fs");
const path = require("path");
const { set } = require("./lib/configs/mapConfig");

// 將 Service 變量移到全局作用域
let Service;

try {
  Service = new mqtt2modbus();
  logger.info("腳本啟動");
  Service.startMQTT();
  Service.startModbus();
} catch (error) {
  logger.error("Error starting service: " + error.message);
  console.error("Error starting service:", error);
  process.exit(1);
}

// 處理終端機關閉信號
process.on("SIGINT", () => {
  handleExit();
  console.log("Received SIGINT. Exiting...");
  setTimeout(() => {
    console.log("Exiting after 3 seconds...");
    process.exit(0);
  }, 3000);
});

function handleExit() {
  try {
    // 確保 Service 存在再停止服務
    if (Service) {
      Service.stopMQTT && Service.stopMQTT();
      Service.stopModbus && Service.stopModbus();
      console.log("服務成功關閉");
      logger.info("服務成功關閉");
    } else {
      console.warn("服務未初始化，無需關閉");
      logger.warn("服務未初始化，無需關閉");
    }
  } catch (error) {
    console.error("關閉服務時出錯:", error.message);
    logger.error(`關閉服務時出錯: ${error.message}`);
  }
  logger.info("腳本已退出");
}
