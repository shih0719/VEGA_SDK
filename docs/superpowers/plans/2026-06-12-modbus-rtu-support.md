# Modbus RTU Serial Port Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Modbus RTU over serial port as an alternative to TCP, selected via `configs/settings.json`.

**Architecture:** Single `ModbusService` class gains a mode branch in `start()` — TCP path stays unchanged, RTU path uses `ModbusRTU.ServerSerial` with flat serial options. No changes to callers (`cli.js`, `core.js`).

**Tech Stack:** Node.js, `modbus-serial@8.0.23` (`ServerSerial`), Jest (tests)

---

## Key API Facts (read before coding)

- `ModbusRTU.ServerSerial(vector, options)` — options are **flat** (not nested):
  ```js
  { path: "COM3", baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" }
  ```
- `ServerSerial` emits: `initialized`, `socketError`, `error` — **no `serverError`**
- `ServerTCP` emits: `initialized`, `socketError`, `serverError`, `error`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `tests/ModbusService.test.js` | **Create** | Unit tests for TCP + RTU mode branching |
| `lib/services/ModbusService.js` | **Modify** | `start()` branches on `mode`; RTU uses `ServerSerial` |
| `configs/settings.json` | **Modify** | Add `mode`, `serial` fields |
| `docker-compose.yml` | **Modify** | Add `devices` section for serial port |
| `.env.example` | **Create** | Document `MODBUS_SERIAL_PATH` env var |

---

## Task 1: Write failing tests for ModbusService RTU mode

**Files:**
- Create: `tests/ModbusService.test.js`

- [ ] **Step 1: Create the test file**

```js
// tests/ModbusService.test.js
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

// ── TCP (existing behaviour) ──────────────────────────────────────────────────

describe("TCP mode", () => {
  test("start() creates ServerTCP when mode is 'tcp'", async () => {
    mockServerTCP.mockImplementation(() => {
      setImmediate(() => mockTCPInstance.emit("initialized"));
      return mockTCPInstance;
    });

    const svc = new ModbusService({ mode: "tcp", host: "127.0.0.1", port: 502 }, {}, jest.fn());
    await svc.start();

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
```

- [ ] **Step 2: Run the tests and confirm they fail**

```
npm test -- tests/ModbusService.test.js
```

Expected: All RTU tests FAIL (ServerSerial never called, no branching logic yet). TCP defaults test may pass if existing code handles it — that's fine.

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/ModbusService.test.js
git commit -m "test: add failing tests for ModbusService RTU mode"
```

---

## Task 2: Implement RTU mode in ModbusService

**Files:**
- Modify: `lib/services/ModbusService.js`

- [ ] **Step 1: Replace the `start()` method**

Replace the entire `start()` method (lines 20–68) with:

```js
  start() {
    if (this.isModbusRunning) {
      throw new Error("Modbus server is already running.");
    }

    return new Promise((resolve, reject) => {
      const handlers = {
        getHoldingRegister: this._getHoldingRegister.bind(this),
        setRegister: (addr, value) =>
          this._handleExternalWriteRequest(addr, value),
      };

      const mode = this.modbusConfig.mode || "tcp";

      if (mode === "rtu") {
        const serial = this.modbusConfig.serial;
        if (!serial || !serial.path) {
          return reject(
            new Error(
              "Modbus RTU mode requires modbus.serial.path in settings.json"
            )
          );
        }
        this.modbusServer = new ModbusRTU.ServerSerial(handlers, {
          path: serial.path,
          baudRate: serial.baudRate,
          dataBits: serial.dataBits,
          stopBits: serial.stopBits,
          parity: serial.parity,
        });
        logger.info(
          `Modbus RTU server starting on ${serial.path} @ ${serial.baudRate} baud`
        );
      } else if (mode === "tcp") {
        this.modbusServer = new ModbusRTU.ServerTCP(handlers, {
          host: this.modbusConfig.host,
          port: this.modbusConfig.port,
        });
      } else {
        return reject(
          new Error(
            `Unknown modbus mode: "${mode}". Expected "tcp" or "rtu".`
          )
        );
      }

      this.modbusServer.once("initialized", () => {
        this.isModbusRunning = true;
        this._startSaveTimer();
        const connInfo =
          mode === "rtu"
            ? `${this.modbusConfig.serial.path} @ ${this.modbusConfig.serial.baudRate} baud`
            : `${this.modbusConfig.host}:${this.modbusConfig.port}`;
        logger.info(
          `Modbus ${mode.toUpperCase()} server started on ${connInfo} with save interval ${this.saveInterval}ms`
        );
        this.emit("started");
        resolve();
      });

      if (mode === "tcp") {
        this.modbusServer.on("serverError", (err) => {
          logger.error("Modbus server error:", err);
          const error = createError(
            "service",
            `Modbus server error: ${err.message}`,
            5001,
            { service: "Modbus", originalError: err }
          );
          this.emit("error", error);
          if (!this.isModbusRunning) reject(error);
        });
      }

      this.modbusServer.on("socketError", (err) => {
        logger.error("Modbus socket error:", err);
        this.emit(
          "error",
          createError("service", `Modbus socket error: ${err.message}`, 5002, {
            service: "Modbus",
            originalError: err,
          })
        );
      });
    });
  }
```

- [ ] **Step 2: Run the tests and confirm they all pass**

```
npm test -- tests/ModbusService.test.js
```

Expected: All tests PASS.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

```
npm test
```

Expected: All existing tests in `tests/core.test.js` still pass.

- [ ] **Step 4: Commit the implementation**

```bash
git add lib/services/ModbusService.js
git commit -m "feat: add Modbus RTU serial port mode to ModbusService"
```

---

## Task 3: Update settings.json

**Files:**
- Modify: `configs/settings.json`

- [ ] **Step 1: Add mode and serial fields**

Replace the entire `modbus` block in `configs/settings.json`:

```json
{
  "mqtt": {
    "url": "mqtt://192.168.23.58:1883",
    "options": {
      "clientId": "mqttjs02355",
      "username": "user",
      "password": "password",
      "reconnectPeriod": 1000,
      "connectTimeout": 60000,
      "keepalive": 60
    }
  },
  "modbus": {
    "mode": "tcp",
    "host": "127.0.0.1",
    "port": 502,
    "serial": {
      "path": "COM3",
      "baudRate": 9600,
      "dataBits": 8,
      "stopBits": 1,
      "parity": "none"
    }
  },
  "ui": {
    "port": 8080
  }
}
```

`serial` is present but only read when `mode` is `"rtu"`. Change `mode` to `"rtu"` and update `serial.path` when deploying with a serial device.

- [ ] **Step 2: Commit**

```bash
git add configs/settings.json
git commit -m "config: add modbus mode and serial port settings"
```

---

## Task 4: Docker serial port support

**Files:**
- Modify: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Add devices section to docker-compose.yml**

Add a `devices` block inside the `vega-sdk` service, after the `volumes` block:

```yaml
    devices:
      - "${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}:${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}"
```

The full `vega-sdk` service should look like:

```yaml
services:
  vega-sdk:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vega-sdk
    restart: unless-stopped
    init: true
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "502:502"
      - "8080:8080"
    environment:
      - NODE_ENV=production
    volumes:
      - ./configs:/app/configs
      - ./logs/prod:/app/logs/prod
      - ./logs/dev:/app/logs/dev
    devices:
      - "${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}:${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}"
    networks:
      - vega-network
```

- [ ] **Step 2: Create .env.example**

Create `.env.example` at the project root:

```env
# Modbus RTU serial port device path (Linux only).
# Only needed when configs/settings.json has modbus.mode = "rtu".
# Must match the serial.path value in settings.json.
# Example values: /dev/ttyUSB0, /dev/ttyS0
MODBUS_SERIAL_PATH=/dev/ttyUSB0
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add Docker serial port device mapping for Modbus RTU"
```

---

## Self-review Notes

- `ServerSerial` has no `serverError` event — the plan correctly scopes that handler to `mode === "tcp"` only
- `serial` fields in `settings.json` are ignored when `mode === "tcp"`, so no migration needed for existing deployments
- Windows Docker (WSL2) cannot forward COM ports without `usbipd-win` — not addressed in code, documented in spec
