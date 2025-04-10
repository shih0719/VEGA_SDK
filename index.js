const mqtt2modbus = require("./lib/core");

const Service = new mqtt2modbus();
Service.startMQTT();
Service.startModbus();
