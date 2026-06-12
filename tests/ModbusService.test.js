const EventEmitter = require("events");

const mockTCPInstance = new EventEmitter();
mockTCPInstance.close = jest.fn((cb) => { if (cb) cb(null); });

const mockSerialInstance = new EventEmitter();
mockSerialInstance.close = jest.fn((cb) => { if (cb) cb(null); });

const mockServerTCP = jest.fn(() => mockTCPInstance);
const mockServerSerial = jest.fn(() => mockSerialInstance);

jest.mock("modbus-serial", () => ({
  ServerTCP: mockServerTCP,
  ServerSerial: mockServerSerial,
}));

const ModbusService = require("../lib/services/ModbusService");

beforeEach(() => {
  jest.clearAllMocks();
  mockTCPInstance.removeAllListeners();
  mockSerialInstance.removeAllListeners();
});

const startedServices = [];

afterEach(() => {
  startedServices.forEach((svc) => svc._stopSaveTimer());
  startedServices.length = 0;
});

// ── TCP (existing behaviour) ──────────────────────────────────────────────────

describe("TCP mode", () => {
  test("start() creates ServerTCP when mode is 'tcp'", async () => {
    mockServerTCP.mockImplementation(() => {
      setImmediate(() => mockTCPInstance.emit("initialized"));
      return mockTCPInstance;
    });

    const svc = new ModbusService({ mode: "tcp", host: "127.0.0.1", port: 502 }, {}, jest.fn());
    await svc.start();
    startedServices.push(svc);

    expect(mockServerTCP).toHaveBeenCalledWith(
      expect.objectContaining({
        getHoldingRegister: expect.any(Function),
        setRegister: expect.any(Function),
      }),
      { host: "127.0.0.1", port: 502 }
    );
    expect(mockServerSerial).not.toHaveBeenCalled();
  });

  test("start() defaults to TCP when mode field is absent", async () => {
    mockServerTCP.mockImplementation(() => {
      setImmediate(() => mockTCPInstance.emit("initialized"));
      return mockTCPInstance;
    });

    const svc = new ModbusService({ host: "127.0.0.1", port: 502 }, {}, jest.fn());
    await svc.start();
    startedServices.push(svc);

    expect(mockServerTCP).toHaveBeenCalled();
  });
});

// ── RTU mode ──────────────────────────────────────────────────────────────────

describe("RTU mode", () => {
  const rtuConfig = {
    mode: "rtu",
    serial: { path: "COM3", baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" },
  };

  test("start() creates ServerSerial with flat serial options", async () => {
    mockServerSerial.mockImplementation(() => {
      setImmediate(() => mockSerialInstance.emit("initialized"));
      return mockSerialInstance;
    });

    const svc = new ModbusService(rtuConfig, {}, jest.fn());
    await svc.start();
    startedServices.push(svc);

    expect(mockServerSerial).toHaveBeenCalledWith(
      expect.objectContaining({
        getHoldingRegister: expect.any(Function),
        setRegister: expect.any(Function),
      }),
      { path: "COM3", baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" }
    );
    expect(mockServerTCP).not.toHaveBeenCalled();
  });

  test("start() resolves and emits 'started' after initialized", async () => {
    mockServerSerial.mockImplementation(() => {
      setImmediate(() => mockSerialInstance.emit("initialized"));
      return mockSerialInstance;
    });

    const svc = new ModbusService(rtuConfig, {}, jest.fn());
    const startedSpy = jest.fn();
    svc.on("started", startedSpy);
    await svc.start();
    startedServices.push(svc);

    expect(startedSpy).toHaveBeenCalledTimes(1);
    expect(svc.isRunning()).toBe(true);
  });

  test("start() rejects when serial config is missing", async () => {
    const svc = new ModbusService({ mode: "rtu" }, {}, jest.fn());
    await expect(svc.start()).rejects.toThrow(
      "Modbus RTU mode requires modbus.serial.path in settings.json"
    );
  });

  test("start() rejects when serial.path is missing", async () => {
    const svc = new ModbusService(
      { mode: "rtu", serial: { baudRate: 9600 } },
      {},
      jest.fn()
    );
    await expect(svc.start()).rejects.toThrow(
      "Modbus RTU mode requires modbus.serial.path in settings.json"
    );
  });
});

// ── Unknown mode ──────────────────────────────────────────────────────────────

describe("unknown mode", () => {
  test("start() rejects with descriptive error", async () => {
    const svc = new ModbusService({ mode: "ascii" }, {}, jest.fn());
    await expect(svc.start()).rejects.toThrow('Unknown modbus mode: "ascii"');
  });
});
