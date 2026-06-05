# Settings UI Design

**Date:** 2026-06-05
**Scope:** Add a Settings tab to the existing web admin UI for editing `configs/settings.json`

## Goal

Allow operators to edit MQTT and Modbus connection settings from the browser without touching the filesystem. After saving, the Docker container restarts automatically to apply the new settings.

## API Layer

Two new endpoints added to `lib/api/server.js`:

### `GET /api/settings`
Returns only the editable subset of `configs/settings.json`:
```json
{
  "mqttUrl": "mqtt://192.168.23.58:1883",
  "mqttUsername": "user",
  "mqttPassword": "password",
  "modbusPort": 502
}
```

### `POST /api/settings`
Accepts the same shape. Validates:
- All fields present and non-empty
- `modbusPort` is an integer

Merges values into the full `settings.json` structure (preserving `mqtt.options.*` fields not exposed in the UI), writes the file, responds `{ ok: true }`, then calls `setTimeout(() => process.exit(0), 500)`.

Docker `restart: always` brings the container back up automatically.

## UI Layer

### Tab Navigation
A tab bar added below the header with two tabs: **Config Map** (existing content) and **設定** (new). Tab state is in-memory only; no URL routing needed.

### Settings Form Fields
| Label | Field | Type |
|---|---|---|
| MQTT Broker URL | `mqttUrl` | text |
| MQTT 使用者名稱 | `mqttUsername` | text |
| MQTT 密碼 | `mqttPassword` | password (with show/hide toggle) |
| Modbus Port | `modbusPort` | number |

### Save & Restart Flow
1. User fills form and clicks **儲存並重啟**
2. `POST /api/settings` is sent
3. On success: UI replaces the form with a "重新連線中…" overlay
4. Every 2 seconds: poll `GET /api/settings`
5. On success: show "服務已重新啟動 ✓", restore normal UI after 2 seconds
6. On repeated failure (e.g. 30s timeout): show error message prompting manual check

### Style
Reuses existing classes: `.card`, `.form-group`, `.btn-primary`, `.btn-success`, `.btn-ghost`. No new CSS frameworks.

## Files Changed

| File | Change |
|---|---|
| `lib/api/server.js` | Add `GET /api/settings` and `POST /api/settings` handlers |
| `lib/api/public/index.html` | Add tab bar, Settings tab content, reconnect overlay |

## Out of Scope
- Real-time monitoring / WebSocket
- Editing advanced MQTT options (clientId, keepalive, timeouts)
- UI port editing (changing it mid-session would break the connection)
- Authentication / access control for the admin UI
