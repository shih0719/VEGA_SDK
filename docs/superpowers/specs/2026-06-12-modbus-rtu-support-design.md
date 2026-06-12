# Modbus RTU Serial Port Support

**Date:** 2026-06-12  
**Status:** Approved

## Overview

Add Modbus RTU over serial port (COM/ttyUSB) as an alternative to the existing Modbus TCP server. The transport mode is selected via `configs/settings.json`. No changes to the public interface of `ModbusService` — callers (`cli.js`, `core.js`) are unaffected.

## Approach

Single `ModbusService` class with internal mode branching in `start()`. No new classes or abstractions. The rest of the service (register read/write, save timer, events) is shared between both modes.

## Configuration

### `configs/settings.json`

Add `mode` field and `serial` sub-object under `modbus`:

```json
{
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
  }
}
```

- `mode`: `"tcp"` (default, backward-compatible) or `"rtu"`
- `serial` is only read when `mode === "rtu"`
- Omitting `mode` defaults to `"tcp"` — existing deployments are unaffected

## ModbusService Changes (`lib/services/ModbusService.js`)

### `start()` branching

```javascript
start() {
  if (this.isModbusRunning) throw new Error("Modbus server is already running.");

  return new Promise((resolve, reject) => {
    const handlers = {
      getHoldingRegister: this._getHoldingRegister.bind(this),
      setRegister: (addr, value) => this._handleExternalWriteRequest(addr, value),
    };

    const mode = this.modbusConfig.mode || "tcp";

    if (mode === "rtu") {
      const serial = this.modbusConfig.serial;
      if (!serial || !serial.path) {
        return reject(new Error("Modbus RTU mode requires modbus.serial.path in settings.json"));
      }
      this.modbusServer = new ModbusRTU.ServerSerial(handlers, {
        path: serial.path,
        SerialPort: {
          baudRate: serial.baudRate,
          dataBits: serial.dataBits,
          stopBits: serial.stopBits,
          parity: serial.parity,
        },
      });
      logger.info(`Modbus RTU server starting on ${serial.path} @ ${serial.baudRate} baud`);
    } else if (mode === "tcp") {
      this.modbusServer = new ModbusRTU.ServerTCP(handlers, {
        host: this.modbusConfig.host,
        port: this.modbusConfig.port,
      });
    } else {
      return reject(new Error(`Unknown modbus mode: "${mode}". Expected "tcp" or "rtu".`));
    }

    this.modbusServer.once("initialized", () => {
      this.isModbusRunning = true;
      this._startSaveTimer();
      const connInfo = mode === "rtu"
        ? `${this.modbusConfig.serial.path} @ ${this.modbusConfig.serial.baudRate} baud`
        : `${this.modbusConfig.host}:${this.modbusConfig.port}`;
      logger.info(`Modbus ${mode.toUpperCase()} server started on ${connInfo} with save interval ${this.saveInterval}ms`);
      this.emit("started");
      resolve();
    });

    // existing error handlers unchanged
  });
}
```

### `stop()`

No changes needed — `modbusServer.close()` works for both TCP and Serial servers.

## Validation

Inside `start()` before server creation:

| Condition | Error |
|---|---|
| `mode === "rtu"` and `serial` missing | `"Modbus RTU mode requires modbus.serial.path in settings.json"` |
| `mode` is unknown string | `"Unknown modbus mode: \"<value>\". Expected \"tcp\" or \"rtu\"."` |
| `mode` absent | defaults to `"tcp"` silently |

## Docker Support (`docker-compose.yml`)

Add `devices` mapping so the container can access the serial port:

```yaml
services:
  vega-sdk:
    # ... existing config ...
    devices:
      - "${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}:${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}"
```

Add `.env.example` (or update if it exists):

```env
# Modbus RTU serial port path (Linux). Only needed when modbus.mode = "rtu".
MODBUS_SERIAL_PATH=/dev/ttyUSB0
```

The `serial.path` in `settings.json` must match the device path mounted into the container.

**Note:** On Windows with Docker Desktop (WSL2), COM ports are not automatically forwarded into the container. For RTU development on Windows, run directly with `npm run dev` instead of Docker.

## Files Changed

| File | Change |
|---|---|
| `configs/settings.json` | Add `mode`, `serial` fields under `modbus` |
| `lib/services/ModbusService.js` | Branch `start()` on `mode` |
| `docker-compose.yml` | Add `devices` section |
| `.env.example` | Add `MODBUS_SERIAL_PATH` entry (create if absent) |
