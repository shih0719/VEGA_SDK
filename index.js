const mqtt2modbus = require('./lib/core');
const config = require('./lib/config');

const Service = new mqtt2modbus(config);
Service.startMQTT();
Service.startModbus();
Service.on('mqttConnected', () => {
    Service.subscribe('test/GW/+');
});
