# Fix cli.js Service.start() Await — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure that `Service.start()` failures (RTU config error, unknown Modbus mode, MQTT connect error) exit the process cleanly before the readline REPL initializes — instead of showing a prompt on a broken service.

**Architecture:** `lib/cmd/cli.js` currently calls `Service.start()` without `await`, so startup failures become unhandled rejections caught only after the synchronous REPL setup runs. Wrapping the startup in an `async` IIFE lets us `await Service.start()`, catch failures synchronously in the startup path, log and exit before `showHelp()` / `rl.prompt()` fire.

**Tech Stack:** Node.js, Commander.js, readline

---

## File Map

| File | Action | Change |
|---|---|---|
| `lib/cmd/cli.js` | Modify | Wrap post-parse startup in `async` IIFE; `await Service.start()` |
| `tests/core.test.js` | Read | Understand existing test structure (no changes needed) |

---

## Task 1: Wrap CLI startup in async IIFE

**Files:**
- Modify: `lib/cmd/cli.js`

**Context:** `cli.js` is not a module — it is the entry point executed directly by Node. It cannot be `async` at the top level (Node 14 ESM limitation doesn't apply here since this is CJS, but top-level await is not available in CJS). The fix is an `async` IIFE that wraps everything from `Service.start()` through `rl.prompt()`.

Current code structure (lines 74-194):
```js
Service.start(); // line 74 — no await
logger.info(`CLI 應用程式啟動中...`); // line 75
// ... readline setup, showHelp, rl.prompt ...
```

Target structure:
```js
(async () => {
  try {
    await Service.start();
    logger.info(`CLI 應用程式啟動中...`);
    if (options.verbose) { ... }
    showHelp();
    rl.prompt();
  } catch (err) {
    logger.error(`服務啟動失敗: ${err.message}`, err);
    process.exit(1);
  }
})();
```

- [ ] **Step 1: Identify the exact lines to restructure in `lib/cmd/cli.js`**

Open `lib/cmd/cli.js`. Locate:
- Line 74: `Service.start(); // 啟動服務`
- Line 75: `logger.info(...)`
- Lines 76-78: `if (options.verbose) { ... }`
- Lines 193-194: `showHelp(); rl.prompt();` (at the bottom of the file)

Note: `showHelp` and `rl.prompt` are currently at the very end. They must move inside the IIFE (after await).

- [ ] **Step 2: Replace lines 74–78 and 193–194 with the async IIFE**

Delete line 74 (`Service.start()`) and lines 76-78 (`if (options.verbose) {...}`).
Delete lines 193-194 (`showHelp(); rl.prompt();`).

In their place (after `program.parse` and before the `rl = readline.createInterface(...)` call), add:

```js
// --- 啟動服務 ---
(async () => {
  try {
    await Service.start();
    logger.info(`CLI 應用程式啟動中...`);
    if (options.verbose) {
      logger.info(chalk.magenta("詳細模式已啟用。"));
    }
    showHelp();
    rl.prompt();
  } catch (err) {
    logger.error(`服務啟動失敗: ${err.message}`, err);
    process.exit(1);
  }
})();
```

> **Important:** The `readline.createInterface(...)` call and the `rl.on("line", ...)` / `rl.on("close", ...)` handlers must remain OUTSIDE the IIFE — they define the REPL behavior but do not start prompting until `rl.prompt()` is called from inside the IIFE. The `gracefulShutdown` function and process signal handlers also stay outside.

The final ordering in the file should be:

```
1. require / config / service instantiation (unchanged)
2. Commander.js setup + program.parse (unchanged)
3. readline.createInterface (unchanged)
4. gracefulShutdown function (unchanged)
5. process.on("SIGINT") / process.on("SIGTERM") (unchanged)
6. process.on("uncaughtException") / process.on("unhandledRejection") (unchanged)
7. showHelp function definition (unchanged)
8. rl.on("line", ...) handler (unchanged)
9. rl.on("close", ...) handler (unchanged)
10. <<NEW>> async IIFE: await Service.start() → showHelp() → rl.prompt()
```

- [ ] **Step 3: Verify the file runs without syntax errors**

```bash
node --check lib/cmd/cli.js
```

Expected: no output (clean parse).

- [ ] **Step 4: Smoke-test startup manually**

```bash
npm run dev
```

Expected: service starts, MQTT connects (or logs reconnect), Modbus server starts, then `>> ` prompt appears. If MQTT/Modbus are unreachable, the startup error should be logged and the process should exit with code 1 — the `>> ` prompt should NOT appear.

- [ ] **Step 5: Commit**

```bash
git add lib/cmd/cli.js
git commit -m "fix: await Service.start() in cli.js so startup failures exit before REPL initializes"
```
