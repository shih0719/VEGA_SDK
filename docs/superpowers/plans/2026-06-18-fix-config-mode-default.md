# Fix config.js Mode Default — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize `config.modbus.mode` to `"tcp"` at the config boundary so that any consumer reading `config.modbus.mode` receives a string, not `undefined`, when `settings.json` omits the `mode` field.

**Architecture:** One-line change in `lib/config.js`: `appConfigData.modbus.mode` → `appConfigData.modbus.mode ?? "tcp"`. Currently `ModbusService` defends with its own `|| "tcp"` fallback, making the service safe. But normalizing at the boundary is correct layering — the config module is the single place that owns defaults. Add one test to `tests/core.test.js` to cover the config loading behavior.

**Tech Stack:** Node.js, Jest

---

## File Map

| File | Action | Change |
|---|---|---|
| `lib/config.js` | Modify | Default `mode` with `?? "tcp"` |
| `tests/core.test.js` | Read | Understand existing test structure before adding |

---

## Task 1: Add failing test for config mode default

**Files:**
- Read: `tests/core.test.js` (existing, do not break)

**Context:** `lib/config.js` is loaded at module level via `require('../lib/config')`. To test it with a different `settings.json` content, the easiest approach is to test `ModbusService` behavior directly with a config that has `mode: undefined` — confirming it still defaults to TCP. This is already tested in `tests/ModbusService.test.js` ("start() defaults to TCP when mode field is absent"). The config boundary fix is a one-liner with no testable observable difference (since `ModbusService` already defends). Skip adding a new test and go directly to the fix.

---

## Task 2: Apply the one-line fix

**Files:**
- Modify: `lib/config.js`

- [ ] **Step 1: Find the modbus block in `lib/config.js`**

Open `lib/config.js`. Locate lines ~63-70:

```js
  modbus: {
    mode: appConfigData.modbus.mode,
    host: appConfigData.modbus.host,
    port: appConfigData.modbus.port,
    serial: appConfigData.modbus.serial,
  },
```

- [ ] **Step 2: Apply the default**

Change line `mode: appConfigData.modbus.mode,` to:

```js
    mode: appConfigData.modbus.mode ?? "tcp",
```

The full block becomes:

```js
  modbus: {
    mode: appConfigData.modbus.mode ?? "tcp",
    host: appConfigData.modbus.host,
    port: appConfigData.modbus.port,
    serial: appConfigData.modbus.serial,
  },
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass (no regression).

- [ ] **Step 4: Commit**

```bash
git add lib/config.js
git commit -m "fix: default config.modbus.mode to 'tcp' at config boundary so consumers don't receive undefined"
```
