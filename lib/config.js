const { validateDeviceMap } = require("./configValidator");
const ConfigError = require("./errors/config-error");

const fs = require("fs");
const path = require("path");

require("dotenv").config();

let deviceMapData;

try {
  const configDir = path.resolve(__dirname, "..", "configs");
  const configMapPath = path.join(configDir, "config_map.json");

  console.log(`Loading config from ${configMapPath}`);

  if (!fs.existsSync(configDir)) {
    throw new Error(`Configuration directory does not exist: ${configDir}`);
  }

  if (!fs.existsSync(configMapPath)) {
    throw new Error(`Configuration file does not exist: ${configMapPath}`);
  }

  const rawData = fs.readFileSync(configMapPath, "utf8");
  deviceMapData = JSON.parse(rawData);

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
  process.exit(1);
}

const config = {
  mqtt: {
    url: process.env.MQTT_URL,
    options: {
      clientId: process.env.MQTT_CLIENT_ID,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: Number(process.env.MQTT_RECONNECT_PERIOD) || 1000,
      connectTimeout: Number(process.env.MQTT_CONNECT_TIMEOUT) || 60000,
      keepalive: Number(process.env.MQTT_KEEPALIVE) || 60,
    },
  },
  modbus: {
    mode: process.env.MODBUS_MODE || "tcp",
    host: process.env.MODBUS_HOST || "0.0.0.0",
    port: Number(process.env.MODBUS_PORT) || 502,
    serial: {
      path: process.env.MODBUS_SERIAL_PATH,
      baudRate: Number(process.env.MODBUS_BAUD_RATE) || 9600,
      dataBits: Number(process.env.MODBUS_DATA_BITS) || 8,
      stopBits: Number(process.env.MODBUS_STOP_BITS) || 1,
      parity: process.env.MODBUS_PARITY || "none",
    },
  },
  ui: {
    port: Number(process.env.UI_PORT) || 18080,
  },
  map: new Map(deviceMapData),
};

config.reverseMap = new Map();
for (let [topic, { type, channels }] of config.map) {
  topic = topic + "/command";
  for (const [channel, addr] of Object.entries(channels)) {
    config.reverseMap.set(addr, { topic, channel, type });
  }
}

module.exports = config;
