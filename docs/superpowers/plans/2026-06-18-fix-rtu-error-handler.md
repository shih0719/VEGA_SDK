# Fix RTU Error Handler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register an `error` event handler on `modbusServer` for RTU mode so that serial port open failures reject the `start()` Promise cleanly instead of crashing the process.

**Architecture:** `ServerSerial` (modbus-serial) emits `error` on port-open failure — not `serverError`. Currently no `error` listener is registered on `this.modbusServer`, so Node.js EventEmitter throws an uncaught exception from inside the Promise executor. The fix adds one `modbusServer.on("error", ...)` handler (unconditional — safe for both modes) that calls `reject()` before initialization and `this.emit("error", ...)` after.

**Tech Stack:** Node.js, modbus-serial@8.0.23, Jest

---

## File Map

| File | Action | Change |
|---|---|---|
| `lib/services/ModbusService.js` | Modify | Add `modbusServer.on("error", ...)` handler in `start()` |
| `tests/ModbusService.test.js` | Modify | Add RTU error-event test case |

---

## Task 1: Add failing test for RTU `error` event

**Files:**
- Modify: `tests/ModbusService.test.js`

**Context:** The test file already has `mockSerialInstance` (an EventEmitter) and a `describe("RTU mode", ...)` block. Add one new test inside that block.

- [ ] **Step 1: Add the failing test inside the existing `describe("RTU mode", ...)` block**

Open `tests/ModbusService.test.js`. Inside `describe("RTU mode", () => { ... })`, after the last existing test, add:

```js
  test("start() rejects when ServerSerial emits error before initialized", async () => {
    mockServerSerial.mockImplementation(() => {
      setImmediate(() => mockSerialInstance.emit("error", new Error("ENOENT: /dev/ttyUSB0")));
      return mockSerialInstance;
    });

    const svc = new ModbusService(rtuConfig, {}, jest.fn());
    // Attach an error listener to prevent ModbusService EventEmitter from throwing
    svc.on("error", () => {});
    await expect(svc.start()).rejects.toThrow("ENOENT: /dev/ttyUSB0");
  });
```

- [ ] **Step 2: Run the test and confirm it fails (times out or throws)**

```bash
npm test -- tests/ModbusService.test.js
```

Expected: the new test FAILS — either times out (Promise never rejects) or the process crashes with an uncaught exception from the EventEmitter.

---

## Task 2: Implement the fix in ModbusService

**Files:**
- Modify: `lib/services/ModbusService.js`

**Context:** In `start()`, after the `if/else if/else` block that sets `this.modbusServer` (after `logger.info(...)` for RTU), and before `this.modbusServer.once("initialized", ...)`, add one new event handler. This handler must:
1. Call `reject(err)` if `!this.isModbusRunning` (startup phase)
2. Always call `this.emit("error", ...)` so CoreService's error handler fires

- [ ] **Step 1: Add the `error` handler**

In `lib/services/ModbusService.js`, locate the `start()` method. Find the block that starts with `this.modbusServer.once("initialized", ...)`. Directly above that line, add:

```js
      this.modbusServer.on("error", (err) => {
        logger.error("Modbus server error event:", err);
        const wrappedError = createError(
          "service",
          `Modbus server error: ${err.message}`,
          5004,
          { service: "Modbus", originalError: err }
        );
        this.emit("error", wrappedError);
        if (!this.isModbusRunning) reject(wrappedError);
      });
```

The result — the relevant portion of `start()` after your edit — should look like:

```js
      // ... if/else if/else block above ...

      this.modbusServer.on("error", (err) => {
        logger.error("Modbus server error event:", err);
        const wrappedError = createError(
          "service",
          `Modbus server error: ${err.message}`,
          5004,
          { service: "Modbus", originalError: err }
        );
        this.emit("error", wrappedError);
        if (!this.isModbusRunning) reject(wrappedError);
      });

      this.modbusServer.once("initialized", () => {
        this.isModbusRunning = true;
        // ...
      });

      this.modbusServer.on("serverError", (err) => {
        // ... existing handler unchanged ...
      });

      this.modbusServer.on("socketError", (err) => {
        // ... existing handler unchanged ...
      });
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS, including the new RTU error-event test.

- [ ] **Step 3: Commit**

```bash
git add lib/services/ModbusService.js tests/ModbusService.test.js
git commit -m "fix: handle ModbusServer error event to reject start() on RTU open failure"
```
