const EventEmitter = require('events');
const CoreService = require('../lib/core');

function makeFakeServices() {
  const mqttService = new EventEmitter();
  mqttService.start = jest.fn().mockResolvedValue(undefined);
  mqttService.stop  = jest.fn().mockResolvedValue(undefined);
  mqttService.subscribe = jest.fn();
  mqttService.publish   = jest.fn();

  const modbusService = new EventEmitter();
  modbusService.start = jest.fn().mockResolvedValue(undefined);
  modbusService.stop  = jest.fn().mockResolvedValue(undefined);
  modbusService.setInternalHoldingRegister = jest.fn();

  const deviceManager = {
    getDeviceLogic: jest.fn().mockReturnValue({
      read:  () => ({}),
      write: () => ({}),
    }),
  };

  return { mqttService, modbusService, deviceManager };
}

const fakeConfig = {
  mqtt:       { broker: 'mqtt://localhost' },
  modbus:     { host: '0.0.0.0', port: 502 },
  map:        new Map(),
  reverseMap: new Map(),
};

describe('CoreService DI', () => {
  test('constructor 未傳 services 時丟出錯誤', () => {
    expect(() => new CoreService(fakeConfig)).toThrow();
  });

  test('constructor 傳入 services 後可正常建立', () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    expect(core).toBeInstanceOf(CoreService);
  });

  test('start() 呼叫 mqttService.start 和 modbusService.start', async () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    await core.start();
    expect(services.mqttService.start).toHaveBeenCalledTimes(1);
    expect(services.modbusService.start).toHaveBeenCalledTimes(1);
  });

  test('stop() 呼叫 mqttService.stop 和 modbusService.stop', async () => {
    const services = makeFakeServices();
    const core = new CoreService(fakeConfig, services);
    await core.stop();
    expect(services.mqttService.stop).toHaveBeenCalledTimes(1);
    expect(services.modbusService.stop).toHaveBeenCalledTimes(1);
  });

  test('MQTT message 觸發 deviceManager.getDeviceLogic', () => {
    const topic = 'device/sensor1';
    const channels = { temp: 100 };
    const config = {
      ...fakeConfig,
      map: new Map([[topic, { type: 'sensor', channels }]]),
    };
    const services = makeFakeServices();
    const core = new CoreService(config, services);
    services.mqttService.emit('message', topic, Buffer.from('{"temp":25}'));
    expect(services.deviceManager.getDeviceLogic).toHaveBeenCalledWith('sensor');
  });
});
