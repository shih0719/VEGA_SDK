require("dotenv").config();
const mqtt2modbus = require("./lib/core");
const config = require("./lib/config");

const Service = new mqtt2modbus(config);
Service.start();
Service.on("mqttConnected", () => {
  // 訂閱邏輯已移至 lib/core.js，根據 config_map.json 自動訂閱
});
