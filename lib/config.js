const { validateDeviceMap } = require("./configValidator");
const ConfigError = require("./errors/config-error");

let deviceMapData;
try {
  deviceMapData = require("../config_map.json");
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
    url: "mqtt://192.168.23.58",
    options: {
      clientId: "mqttjs0234",
      username: "user",
      password: "password",
      reconnectPeriod: 1000, // 重新连接的时间间隔，单位为毫秒
      connectTimeout: 30 * 1000, // 连接超时时间，单位为毫秒
      keepalive: 60, // 心跳间隔时间，单位为秒
    },
  },
  modbus: {
    host: "127.0.0.1",
    port: 502,
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
