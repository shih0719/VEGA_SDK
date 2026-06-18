# Fix Docker Device Mount — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Docker serial device mount opt-in so that TCP-mode deployments can run `docker-compose up` without a physical serial device present.

**Architecture:** Move the `devices:` block out of `docker-compose.yml` (the base file everyone uses) and into a new `docker-compose.rtu.yml` override file. TCP users use `docker-compose up` as before; RTU users use `docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up`. Update README and `.env.example` to reflect this. No code changes required.

**Tech Stack:** Docker Compose v3, YAML

---

## File Map

| File | Action | Change |
|---|---|---|
| `docker-compose.yml` | Modify | Remove `devices:` block |
| `docker-compose.rtu.yml` | Create | Override file containing only the `devices:` block |
| `README.md` | Modify | Update Docker RTU section with new command |
| `docs/modbus-rtu-setup.md` | Modify | Update Docker step with new command |

---

## Task 1: Split device mount into override file

**Files:**
- Modify: `docker-compose.yml`
- Create: `docker-compose.rtu.yml`

- [ ] **Step 1: Remove the `devices:` block from `docker-compose.yml`**

Open `docker-compose.yml`. Find and delete these lines (the comment + the devices block):

```yaml
    # Serial port access for Modbus RTU mode.
    # Remove or comment out if using modbus.mode = "tcp" (default).
    # On Linux: set MODBUS_SERIAL_PATH to the correct device (e.g. /dev/ttyUSB0)
    devices:
      - "${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}:${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}"
```

After removal, the `vega-sdk` service should end with:

```yaml
    volumes:
      - ./configs:/app/configs
      - ./logs/prod:/app/logs/prod
      - ./logs/dev:/app/logs/dev
    networks:
      - vega-network
```

- [ ] **Step 2: Create `docker-compose.rtu.yml`**

Create the file at the project root with this content:

```yaml
# Modbus RTU override — serial port device mapping.
# Usage: docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up -d
#
# Set MODBUS_SERIAL_PATH to match configs/settings.json modbus.serial.path
# Example: export MODBUS_SERIAL_PATH=/dev/ttyUSB0
# Linux only — Windows Docker (WSL2) cannot forward COM ports into containers.

services:
  vega-sdk:
    devices:
      - "${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}:${MODBUS_SERIAL_PATH:-/dev/ttyUSB0}"
```

- [ ] **Step 3: Verify TCP-mode compose parses cleanly**

```bash
docker-compose config
```

Expected: no errors, no `devices:` key appears in the merged output.

- [ ] **Step 4: Verify RTU-mode compose includes the device**

```bash
docker-compose -f docker-compose.yml -f docker-compose.rtu.yml config
```

Expected: output includes `devices: - /dev/ttyUSB0:/dev/ttyUSB0` (or `$MODBUS_SERIAL_PATH`).

---

## Task 2: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/modbus-rtu-setup.md`
- Modify: `.env.example`

- [ ] **Step 1: Update README.md Docker RTU section**

In `README.md`, find the `### Docker Compose（推薦）` section. Add a note about RTU after the existing commands:

```markdown
**Modbus RTU 模式（Docker + Linux）：**

```bash
export MODBUS_SERIAL_PATH=/dev/ttyUSB0   # 須與 settings.json serial.path 一致
docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up -d
```
```

- [ ] **Step 2: Update docs/modbus-rtu-setup.md Docker step**

In `docs/modbus-rtu-setup.md`, find the `#### Docker（僅 Linux）` section. Replace the existing command block with:

```markdown
設定串口裝置路徑環境變數，需與 `settings.json` 的 `serial.path` 一致，並使用 RTU override 檔：

```bash
export MODBUS_SERIAL_PATH=/dev/ttyUSB0
docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up
```

或在 `.env` 檔案中設定（`docker-compose.rtu.yml` 自動讀取）：

```env
MODBUS_SERIAL_PATH=/dev/ttyUSB0
```
```

- [ ] **Step 3: Update `.env.example`**

Replace the contents of `.env.example` with:

```env
# Modbus RTU serial port device path (Linux only).
# Only needed when configs/settings.json has modbus.mode = "rtu".
# Must match the serial.path value in settings.json.
# Example values: /dev/ttyUSB0, /dev/ttyS0
#
# Usage with Docker:
#   docker-compose -f docker-compose.yml -f docker-compose.rtu.yml up -d
MODBUS_SERIAL_PATH=/dev/ttyUSB0
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.rtu.yml README.md docs/modbus-rtu-setup.md .env.example
git commit -m "fix: move serial device mount to docker-compose.rtu.yml override so TCP-mode deployments don't require a serial device"
```
