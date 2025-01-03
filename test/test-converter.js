const mqtt2modbus = require('../lib/core');
const config = require('../lib/config');
const Service = new mqtt2modbus(config);
const message = {
    "function":{
      "switch_ch1":false
    }
  }
const r = Service._handleMQTTMessage('test/GW/DK1',JSON.stringify(message));
for (const key in r){
    console.log(`key:${key},Type of key:${typeof key}`);
}