require("dotenv").config();
const mqtt2modbus = require("./lib/core");
const express = require("express");
const bodyParser = require("body-parser");
const { defaultLogger: logger } = require("./lib/logger"); // 引入 logger
const apiRoutes = require("./routes/api");

let Service; // 宣告 Service 變數

// 載入設定並初始化服務的函數
const loadConfigAndInitializeService = () => {
  // 清除 require 緩存，確保每次都載入最新的設定
  delete require.cache[require.resolve("./lib/config")];
  const config = require("./lib/config");
  return new mqtt2modbus(config);
};

const app = express();
const port = process.env.API_PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 在啟動時初始化服務
Service = loadConfigAndInitializeService();
app.use("/api", apiRoutes(Service));

// API 端點來重啟服務
app.post("/restart", async (req, res) => {
  logger.info("Received request to restart service.");
  try {
    if (Service) {
      await Service.stop(); // 停止舊的服務實例
      logger.info("Old service instance stopped.");
    }
    Service = loadConfigAndInitializeService(); // 重新載入設定並建立新的服務實例
    await Service.start(); // 啟動新的服務實例
    logger.info("New service instance started successfully.");
    res.status(200).send("Service restarted successfully.");
  } catch (error) {
    logger.error("Failed to restart service:", error);
    res.status(500).send("Failed to restart service.");
  }
});

app.listen(port, () => {
  logger.info(`API server listening at http://localhost:${port}`);
});

// 啟動服務
Service.start();
