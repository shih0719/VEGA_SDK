const mqtt2modbus = require("./lib/core");

const Service = new mqtt2modbus();
Service.startMQTT();
Service.startModbus();
Service.on("mqttConnected", () => {
  Service.subscribe("test/GW/+");
  Service.subscribe("eastsoft/0000IPX8/+");
});
