const mqtt2modbus = require('../lib/core');
const config = require('../lib/config');
const Service = new mqtt2modbus(config);

const r = Service._sendMQTT(3,0);