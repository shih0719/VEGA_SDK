// 確保在 pkg 打包的執行檔中 NODE_ENV 被正確設定
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}
const config = require("./lib/config");
const mqtt2modbus = require("./lib/core");

const Service = new mqtt2modbus(config); // 宣告 Service 變數

// 載入設定並初始化服務的函數

// 啟動服務
Service.start();
