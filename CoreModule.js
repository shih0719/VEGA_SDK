const CoreService = require("./lib/core");
const MqttService = require("./lib/services/MqttService");
const ModbusService = require("./lib/services/ModbusService");
const deviceManager = require("./lib/deviceLogic/DeviceManager");

// ponytail: plain identifiers (not inline require()s) so Node's cjs-module-lexer
// can statically detect these as named exports for `import { CoreService } from "vega-sdk"`
module.exports = { CoreService, MqttService, ModbusService, deviceManager };
