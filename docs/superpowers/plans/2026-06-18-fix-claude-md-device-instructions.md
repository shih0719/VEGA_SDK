# Fix CLAUDE.md Device Type Instructions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the "Adding a New Device Type" section in `CLAUDE.md` to reflect the current JSON-driven mechanism (`device_logic.json` + `JsonDeviceLogic`) instead of the outdated class-per-type pattern.

**Architecture:** `DeviceManager` no longer accepts custom classes at runtime in normal operation — it loads from `configs/device_logic.json` via `JsonDeviceLogic`. The `registerDeviceLogic()` method still exists for programmatic use (e.g., SDK consumers), but any type registered that way is evicted by `reload()`. CLAUDE.md must describe both paths: the standard JSON path, and the advanced programmatic path with its caveats.

**Tech Stack:** Markdown (docs only, no code changes)

---

## File Map

| File | Action | Change |
|---|---|---|
| `CLAUDE.md` | Modify | Rewrite "Adding a New Device Type" section |

---

## Task 1: Rewrite the device type section in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Context:** The current section says:
```
## Adding a New Device Type

1. Create `lib/deviceLogic/MyDeviceLogic.js` extending `BaseDeviceLogic`
2. Implement `read(message)` ... and `write(channel, value)` ...
3. Register it in `DeviceManager.js`: `this.registerDeviceLogic("mytype", MyDeviceLogic)`
4. Add entries to `configs/config_map.json` using `"type": "mytype"`
```

This is wrong. `DeviceManager` now auto-loads from `configs/device_logic.json`. Calling `registerDeviceLogic()` works but is wiped on any `reload()` (triggered by `POST /api/device-logic`).

The `JsonDeviceLogic` supports these field transforms:
- `read` transforms: `passthrough`, `boolean_to_int`, `scale`, `enum`, `scale_split32`, `skip`
- `write` transforms: `passthrough`, `int_to_boolean`, `scale_inverse`, `enum_reverse`, `assert_one_to_zero`

- [ ] **Step 1: Replace the "Adding a New Device Type" section in `CLAUDE.md`**

Find the section starting with `## Adding a New Device Type`. Replace the entire section (up to the next `##` heading) with:

```markdown
## Adding a New Device Type

### Standard path — JSON config (recommended)

Add an entry to `configs/device_logic.json`:

```json
{
  "deviceType": "mytype",
  "readOnly": false,
  "defaultTransform": "passthrough",
  "fields": [
    { "name": "power",  "read": "boolean_to_int", "write": "int_to_boolean" },
    { "name": "temp",   "read": "scale", "scaleFactor": 10, "write": "scale_inverse" }
  ]
}
```

Available `read` transforms: `passthrough`, `boolean_to_int`, `scale` (requires `scaleFactor`), `enum` (requires `enumMap`), `scale_split32` (requires `scaleFactor`, `highKey`, `lowKey`), `skip`

Available `write` transforms: `passthrough`, `int_to_boolean`, `scale_inverse` (requires `scaleFactor`), `enum_reverse` (requires `writeEnumMap`), `assert_one_to_zero`

Set `"readOnly": true` to block writes and raise DeviceError 4011 on any write attempt.

Then add entries to `configs/config_map.json` using `"type": "mytype"`. No restart needed for `device_logic.json` changes — `POST /api/device-logic` reloads them live. A restart IS required after `config_map.json` changes.

### Advanced path — custom Logic class (SDK consumers only)

If `JsonDeviceLogic` field transforms are insufficient, extend `BaseDeviceLogic`:

1. Create `lib/deviceLogic/MyDeviceLogic.js` extending `BaseDeviceLogic`
2. Implement `validateData(data)`, `transformRead(data)`, `transformWrite(channel, value)`
3. Call `deviceManager.registerDeviceLogic("mytype", MyDeviceLogic)` at startup **before** `CoreService` is constructed

**Warning:** `registerDeviceLogic()` registrations are cleared whenever `DeviceManager.reload()` is called (triggered by `POST /api/device-logic`). Custom classes registered this way are not persisted. This path is intended for SDK consumers who control the startup code — not for in-process additions via the Web UI.
```

- [ ] **Step 2: Verify the Markdown renders without broken links or code fences**

Open `CLAUDE.md` in a Markdown viewer or run:

```bash
node -e "require('fs').readFileSync('CLAUDE.md', 'utf8'); console.log('OK')"
```

Expected: `OK` (file is readable).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct CLAUDE.md device type instructions to reflect JSON-driven DeviceManager"
```
