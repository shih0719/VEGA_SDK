# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

VEGA SDK is a **MQTT-to-Modbus bridge** service. It subscribes to MQTT topics for device state messages, maps them to Modbus holding registers, and exposes a Modbus TCP server. External systems write to Modbus registers to issue device control commands, which are then published back to MQTT.

## Commands

```bash
# Install dependencies
pnpm install

# Run in development mode
npm run dev          # NODE_ENV=development

# Run in production
npm start            # plain node
npm run start:prod   # NODE_ENV=production

# PM2 (process manager)
npm run ecosystem    # pm2 start ecosystem.config.js --env production

# Docker
npm run docker:compose:up     # start with docker-compose
npm run docker:compose:build  # rebuild and start
npm run docker:compose:down   # stop
npm run docker:compose:logs   # follow logs
```

No test runner is configured. There is no lint script.

## Architecture

```
index.js               → entry point, delegates to lib/cmd/cli.js
CoreModule.js          → library entry point (exports lib/core.js CoreService)
lib/
  cmd/cli.js           → Commander.js CLI + readline REPL, instantiates CoreService
  core.js              → CoreService (EventEmitter) — wires MQTT ↔ Modbus
  config.js            → loads configs/settings.json + configs/config_map.json, builds Map/reverseMap
  configValidator.js   → validates config_map.json schema
  services/
    MqttService.js     → wraps `mqtt` client, emits: connected, message, disconnected, error
    ModbusService.js   → wraps `modbus-serial`, runs Modbus TCP server, emits: started, stopped, error, externalWriteRequest
  deviceLogic/
    BaseDeviceLogic.js → abstract base with read(message)/write(channel, value) interface
    DeviceManager.js   → singleton registry; maps type string → logic instance
    AirConditionLogic, SwitchLogic, PanelLogic, HPDLogic, MeterLogic
  api/
    server.js          → plain-Node HTTP server (no framework); serves web UI + REST API for config management
    public/index.html  → browser UI for editing config_map.json
  errors/              → typed error classes (ConfigError, DeviceError, ServiceError) + createError factory
  logger/              → winston-based logger, exported as defaultLogger
  utils.js             → SameKeytoMap helper (maps channel keys to register values)
configs/
  settings.json        → MQTT broker URL/credentials + Modbus host/port
  config_map.json      → JSON array of [topic, {type, channels}] pairs; channels map channel name → Modbus register address
  holding_registers.json → persisted Modbus holding register state (auto-created at runtime)
converter/
  generate_config.js   → dev tool: generates config_map.json from Excel spreadsheet
```

## Data Flow

**MQTT → Modbus (read device state):**
1. MqttService receives a message on a subscribed topic
2. CoreService looks up the topic in `config.map` to get `{type, channels}`
3. DeviceManager dispatches to the matching `DeviceLogic.read(message)`
4. `SameKeytoMap` maps channel names to register addresses
5. Values are written to `ModbusService.setInternalHoldingRegister(addr, value)`

**Modbus → MQTT (write device command):**
1. External Modbus master writes to a register → `externalWriteRequest` event fires
2. CoreService looks up the address in `config.reverseMap` to get `{topic, channel, type}`
3. `DeviceLogic.write(channel, value)` produces the MQTT payload
4. MqttService publishes to `<topic>/command`

## Adding a New Device Type

1. Create `lib/deviceLogic/MyDeviceLogic.js` extending `BaseDeviceLogic`
2. Implement `read(message)` (returns object with channel keys) and `write(channel, value)` (returns MQTT payload object)
3. Register it in `DeviceManager.js`: `this.registerDeviceLogic("mytype", MyDeviceLogic)`
4. Add entries to `configs/config_map.json` using `"type": "mytype"`

## Web UI / API Server

Started automatically by `cli.js` on the port set in `configs/settings.json` under `ui.port` (defaults to 8080).

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Serves `lib/api/public/index.html` |
| `/api/config` | GET | Returns current `config_map.json` |
| `/api/config` | POST | Validates (via `configValidator`) and overwrites `config_map.json` |
| `/api/device-types` | GET | Returns the hardcoded list of supported device types |

The API server does **not** hot-reload CoreService after a config save — a restart is required to apply changes.

## Configuration

`configs/settings.json` — MQTT broker, Modbus TCP server settings, and optional `ui.port`.

`configs/config_map.json` — stored as a JSON array of `[topic, config]` tuples (not a plain object) because it is loaded directly into a `new Map(deviceMapData)`.

The `reverseMap` is derived automatically from `config.map` at startup — do not edit it manually.
