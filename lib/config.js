const { validateDeviceMap } = require("./configValidator");
const ConfigError = require("./errors/config-error");

const fs = require("fs");
const path = require("path");

let deviceMapData;
let appConfigData;

try {
  // 統一從 configs 資料夾讀取配置文件
  const configDir = path.resolve(__dirname, "..", "configs");
  const configMapPath = path.join(configDir, "config_map.json");
  const settingsPath = path.join(configDir, "settings.json");

  console.log(`Loading config from ${configMapPath} and ${settingsPath}`);

  // 檢查配置目錄是否存在
  if (!fs.existsSync(configDir)) {
    throw new Error(`Configuration directory does not exist: ${configDir}`);
  }

  // 檢查配置文件是否存在
  if (!fs.existsSync(configMapPath)) {
    throw new Error(`Configuration file does not exist: ${configMapPath}`);
  }

  if (!fs.existsSync(settingsPath)) {
    throw new Error(`Settings file does not exist: ${settingsPath}`);
  }

  // 讀取配置文件
  const rawData = fs.readFileSync(configMapPath, "utf8");
  const appRawData = fs.readFileSync(settingsPath, "utf8");

  deviceMapData = JSON.parse(rawData);
  appConfigData = JSON.parse(appRawData);

  validateDeviceMap(deviceMapData);

  console.log("✅ Configuration loaded successfully");
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
    mode: appConfigData.modbus.mode ?? "tcp",
    host: appConfigData.modbus.host,
    port: appConfigData.modbus.port,
    serial: appConfigData.modbus.serial,
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
