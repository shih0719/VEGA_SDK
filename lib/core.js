const mqtt = require('mqtt'); 
const ModbusRTU = require('modbus-serial'); 
const config = require('./config');
const EventEmitter = require('events');

class MQTTtoModbusSDK extends EventEmitter {
  constructor(config) {
    super();
    this.mqttConfig = config.mqtt || {};
    this.modbusConfig = config.modbus || {};
    this.mqttClient = null; // MQTT 連線對象
    this.modbusServer = null; // Modbus server
    this.isMQTTConnected = false;
    this.isModbusRunning = false;
  }

  // 啟動 MQTT 連線
  startMQTT() {
    if (this.isMQTTConnected) {
      throw new Error('MQTT is already connected.');
    }

    this.mqttClient = mqtt.connect(this.mqttConfig.url, this.mqttConfig.options);
    this.mqttClient.on('connect', () => {
      this.isMQTTConnected = true;
      console.log('MQTT connected to', this.mqttConfig.url);
      this.emit('mqttConnected');
    });

    this.mqttClient.on('message', (topic, message) => {
      this._handleMQTTMessage(topic, message);
    });

    this.mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
    });
  }
  subscribe(topic){
    if (!this.isMQTTConnected) {
      throw new Error('MQTT is not connected.');
    }
    this.mqttClient.subscribe(topic);
  }
  // 停止 MQTT 連線
  stopMQTT() {
    if (!this.isMQTTConnected) {
      throw new Error('MQTT is not connected.');
    }

    this.mqttClient.end(() => {
      this.isMQTTConnected = false;
      console.log('MQTT disconnected');
    });
  }

  // 啟動 Modbus server
  startModbus() {
    if (this.isModbusRunning) {
      throw new Error('Modbus server is already running.');
    }

    this.modbusServer = new ModbusRTU.ServerTCP(
        {getInputRegister: (addr) => this._getModbusValue(addr),
    }, { host: this.modbusConfig.host, port: this.modbusConfig.port });

    this.modbusServer.on('error', (err) => {
      console.error('Modbus server error:', err);
    });

    console.log(`Modbus server started on ${this.modbusConfig.host}:${this.modbusConfig.port}`);
    this.isModbusRunning = true;
  }

  // 停止 Modbus server
  stopModbus() {
    if (!this.isModbusRunning) {
      throw new Error('Modbus server is not running.');
    }

    this.modbusServer.close(() => {
      this.isModbusRunning = false;
      console.log('Modbus server stopped');
    });
  }
  //載入邏輯轉換模組
  _getLogicModule(deviceType) {
    try {
      return require(`./readDevice/${deviceType}.js`); 
    } catch (error) {
      throw new Error(`Module for device type "${deviceType}" not found: ${error.message}`);
    }
  }

  // 私有方法：處理 MQTT 訊息並轉換到 Modbus
  _handleMQTTMessage(topic, message) {
    if(topic in config.Topic2Type){
      const type = config.Topic2Type[topic];
      const logic = this._getLogicModule(type);
      const rs = logic.execute(message);
      console.log(rs);
    }
    

  }

  // 私有方法：MQTT 到 Modbus 的轉換邏輯
  _convertMQTTtoModbus(topic, message) {
    // 這裡實現具體轉換邏輯，例如解析主題和訊息
    return { address: 1, value: message.toString() === 'true' ? 1 : 0 };
  }

  // 私有方法：設置 Modbus 值
  _setModbusValue({ address, value }) {
    console.log(`Setting Modbus address ${address} to value ${value}`);
    // 實現對 Modbus 寄存器的設置
  }

  // 私有方法：獲取 Modbus 值
  _getModbusValue(address) {
    console.log(`Getting value for Modbus address ${address}`);
    // 返回對應的值
    return 0; // 示例返回值
  }
}

module.exports = MQTTtoModbusSDK;
