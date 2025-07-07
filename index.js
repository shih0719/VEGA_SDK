const mqtt2modbus = require("./lib/core");
const config = require("./lib/config");

const Service = new mqtt2modbus(config);
Service.start();
Service.on("mqttConnected", () => {
  Service.mqttService.subscribe("test/GW/+");
  Service.mqttService.subscribe("eastsoft/0000IPX8/+");
});
