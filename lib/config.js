const { validateDeviceMap } = require("./configValidator");
const ConfigError = require("./errors/config-error");

const fs = require("fs");
const path = require("path");

let deviceMapData;
try {
  const configMapPath = path.resolve(__dirname, "../config_map.json");
  const rawData = fs.readFileSync(configMapPath, "utf8");
  deviceMapData = JSON.parse(rawData);
  validateDeviceMap(deviceMapData);
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(
      `配置錯誤: ${error.message} (代碼: ${error.code}, 路徑: ${error.configPath})`
    );
  } else {
    console.error(`載入配置時發生未知錯誤: ${error.message}`);
  }
  process.exit(1); // 終止應用程式
}

const config = {
  mqtt: {
    url: process.env.MQTT_URL || "mqtt://localhost:1883",
    options: {
      clientId: process.env.MQTT_CLIENT_ID || "vega-mqtt2modbus",
      username: process.env.MQTT_USERNAME || "user",
      password: process.env.MQTT_PASSWORD || "password",
      reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || 30000, 10),
      connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || 30000, 10),
      keepalive: parseInt(process.env.MQTT_KEEPALIVE || 60, 10),
    },
  },
  modbus: {
    host: process.env.MODBUS_HOST || "127.0.0.1",
    port: parseInt(process.env.MODBUS_PORT || "502", 10),
  },
  map: new Map(deviceMapData),
};

// 由modbus addr查詢對應的topic和channel
config.reverseMap = new Map();
for (let [topic, { type, channels }] of config.map) {
  topic = topic + "/command";
  for (const [channel, addr] of Object.entries(channels)) {
    config.reverseMap.set(addr, { topic, channel, type });
  }
}

module.exports = config;
