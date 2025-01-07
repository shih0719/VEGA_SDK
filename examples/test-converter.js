const mqtt2modbus = require('../lib/core');
const config = require('../lib/config');
const Service = new mqtt2modbus(config);
let message = "{\"function\":{\"switch_ch1\":true,\"button_id\":1}}";
  
try{
    message=JSON.parse(message);
}catch (error) {
    console.error('Failed to parse JSON data:', error);
    message =null;
}
  
  
const r = Service._handleMQTTMessage('test/GW/DK1',JSON.stringify(message));
for (const [key, value] of r) {
  console.log(`Key: ${key}, Type of key: ${typeof key}, Value: ${value}`);
}
