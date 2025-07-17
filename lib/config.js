const { validateDeviceMap } = require("./configValidator");
const ConfigError = require("./errors/config-error");

const fs = require("fs");
const path = require("path");

let deviceMapData;
let appConfigData;
// 根據環境變數載入配置文件
// 如果是生產環境，從APPDATA或LOCALAPPDATA目錄讀取
// 如果是開發環境，從當前目錄讀取
// 如果配置文件不存在或格式錯誤，則拋出錯誤
try {
  const env = process.env.NODE_ENV;
  let configMapPath;
  let settingsPath;
  if (env === "production") {
    configMapPath = path.resolve(
      process.env.LOCALAPPDATA,
      "VEGA_SDK",
      "config_map.json"
    );
    settingsPath = path.resolve(
      process.env.LOCALAPPDATA,
      "VEGA_SDK",
      "settings.json"
    );
    console.log(`Loading config from ${configMapPath} and ${settingsPath}`);
  } else if (env === "development") {
    configMapPath = path.resolve(__dirname, "../config_map.json");
    settingsPath = path.resolve(__dirname, "../settings.json");
    console.log(`Loading config from ${configMapPath} and ${settingsPath}`);
  } else {
    console.error(
      `Unsupported NODE_ENV: ${env}. Please set it to 'production' or 'development'.`
    );
    process.exit(1);
  }
  const rawData = fs.readFileSync(configMapPath, "utf8");
  const appRawData = fs.readFileSync(settingsPath, "utf8");
  deviceMapData = JSON.parse(rawData);
  appConfigData = JSON.parse(appRawData);

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
    url: appConfigData.mqtt.url,
    options: {
      clientId: appConfigData.mqtt.options.clientId,
      username: appConfigData.mqtt.options.username,
      password: appConfigData.mqtt.options.password,
      reconnectPeriod: appConfigData.mqtt.options.reconnectPeriod,
      connectTimeout: appConfigData.mqtt.options.connectTimeout,
      keepalive: appConfigData.mqtt.options.keepalive,
    },
  },
  modbus: {
    host: appConfigData.modbus.host,
    port: appConfigData.modbus.port,
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
