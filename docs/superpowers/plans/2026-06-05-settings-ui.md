# Settings UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings tab to the existing web admin UI so operators can edit MQTT/Modbus connection settings and trigger an automatic Docker container restart.

**Architecture:** Two new API endpoints (`GET/POST /api/settings`) are added to the existing plain-Node HTTP server. The single `index.html` gains a tab bar; the Settings tab renders a form over those endpoints. On save, the server calls `process.exit(0)` after 500ms and the UI polls until the service is back.

**Tech Stack:** Node.js (built-in `http`, `fs`), vanilla JS, existing CSS classes in `index.html`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/api/server.js` | Modify | Add `/api/settings` GET + POST handlers |
| `lib/api/public/index.html` | Modify | Add tab bar, Settings form, reconnect overlay |

---

### Task 1: Add `GET /api/settings` endpoint

**Files:**
- Modify: `lib/api/server.js`

- [ ] **Step 1: Add the SETTINGS_PATH constant and GET handler**

Open `lib/api/server.js`. After the existing `CONFIG_MAP_PATH` constant, add:

```js
const SETTINGS_PATH = path.resolve(__dirname, "../../configs/settings.json");
```

Then inside `handleRequest`, before the static-file block, add:

```js
if (url.pathname === "/api/settings" && req.method === "GET") {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    send(res, 200, {
      mqttUrl:      raw.mqtt?.url ?? "",
      mqttUsername: raw.mqtt?.options?.username ?? "",
      mqttPassword: raw.mqtt?.options?.password ?? "",
      modbusPort:   raw.modbus?.port ?? 502,
    });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
  return;
}
```

- [ ] **Step 2: Manual smoke test**

Start the service (`npm run dev`), then in a terminal:
```
curl http://localhost:8080/api/settings
```
Expected: JSON with `mqttUrl`, `mqttUsername`, `mqttPassword`, `modbusPort`.

- [ ] **Step 3: Commit**

```bash
git add lib/api/server.js
git commit -m "feat: add GET /api/settings endpoint"
```

---

### Task 2: Add `POST /api/settings` endpoint

**Files:**
- Modify: `lib/api/server.js`

- [ ] **Step 1: Add POST handler**

Directly after the GET handler added in Task 1, add:

```js
if (url.pathname === "/api/settings" && req.method === "POST") {
  try {
    const data = await readBody(req);
    const { mqttUrl, mqttUsername, mqttPassword, modbusPort } = data;

    if (!mqttUrl || !mqttUsername || !mqttPassword) {
      send(res, 400, { error: "mqttUrl, mqttUsername, mqttPassword 為必填" });
      return;
    }
    const port = parseInt(modbusPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      send(res, 400, { error: "modbusPort 必須為 1–65535 的整數" });
      return;
    }

    const existing = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    existing.mqtt.url = mqttUrl;
    existing.mqtt.options.username = mqttUsername;
    existing.mqtt.options.password = mqttPassword;
    existing.modbus.port = port;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(existing, null, 2));

    send(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    send(res, 400, { error: err.message });
  }
  return;
}
```

- [ ] **Step 2: Manual smoke test**

```bash
curl -X POST http://localhost:8080/api/settings \
  -H "Content-Type: application/json" \
  -d '{"mqttUrl":"mqtt://192.168.23.58:1883","mqttUsername":"user","mqttPassword":"password","modbusPort":502}'
```
Expected: `{"ok":true}` and the process exits (Docker restarts it).

- [ ] **Step 3: Commit**

```bash
git add lib/api/server.js
git commit -m "feat: add POST /api/settings endpoint with auto-restart"
```

---

### Task 3: Add tab bar to `index.html`

**Files:**
- Modify: `lib/api/public/index.html`

- [ ] **Step 1: Add tab styles**

Inside the `<style>` block, append:

```css
  .tabs {
    display: flex;
    gap: 0;
    background: #121220;
    padding: 0 24px;
  }

  .tab-btn {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: #aaa;
    padding: 10px 20px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 0;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn.active {
    color: #fff;
    border-bottom-color: #4f8ef7;
  }

  .tab-btn:hover { color: #fff; opacity: 1; }

  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  .reconnect-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26,26,46,0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 1.1rem;
    gap: 16px;
    z-index: 200;
  }

  .reconnect-overlay.hidden { display: none; }

  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid #444;
    border-top-color: #4f8ef7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 2: Add tab bar HTML**

Replace the existing `<header>` block:

```html
<header>
  <h1>VEGA SDK &mdash; 管理後臺</h1>
  <span id="status">載入中…</span>
</header>
<nav class="tabs">
  <button class="tab-btn active" onclick="switchTab('config')">Config Map</button>
  <button class="tab-btn" onclick="switchTab('settings')">設定</button>
</nav>
```

- [ ] **Step 3: Wrap existing main content in a tab panel**

Replace:
```html
<main>
```
with:
```html
<main>
<div id="tab-config" class="tab-panel active">
```

And before the closing `</main>`, add `</div>`.

So the structure becomes:
```html
<main>
  <div id="tab-config" class="tab-panel active">
    <!-- existing toolbar + device-list + empty-state -->
  </div>
</main>
```

- [ ] **Step 4: Commit**

```bash
git add lib/api/public/index.html
git commit -m "feat: add tab bar to admin UI"
```

---

### Task 4: Add Settings tab content

**Files:**
- Modify: `lib/api/public/index.html`

- [ ] **Step 1: Add Settings tab panel HTML**

After the closing `</div>` of `tab-config` (and before `</main>`), add:

```html
<div id="tab-settings" class="tab-panel">
  <div class="card" style="max-width:520px;margin:24px auto;">
    <div class="card-header"><span class="topic-label">連線設定</span></div>
    <div class="card-body">
      <div class="form-group">
        <label>MQTT Broker URL</label>
        <input id="s-mqttUrl" type="text" placeholder="mqtt://host:1883" />
      </div>
      <div class="form-group">
        <label>MQTT 使用者名稱</label>
        <input id="s-mqttUsername" type="text" />
      </div>
      <div class="form-group">
        <label>MQTT 密碼</label>
        <div style="display:flex;gap:8px;">
          <input id="s-mqttPassword" type="password" style="flex:1;" />
          <button class="btn-ghost" style="padding:7px 12px;white-space:nowrap;" onclick="togglePassword()">顯示</button>
        </div>
      </div>
      <div class="form-group">
        <label>Modbus Port</label>
        <input id="s-modbusPort" type="number" min="1" max="65535" />
      </div>
      <div class="error-msg" id="settings-error"></div>
      <div style="margin-top:20px;">
        <button class="btn-success" onclick="saveSettings()">儲存並重啟</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add reconnect overlay HTML**

Before the closing `</body>` tag, add:

```html
<div class="reconnect-overlay hidden" id="reconnect-overlay">
  <div class="spinner"></div>
  <div id="reconnect-msg">設定已儲存，服務重新啟動中…</div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add lib/api/public/index.html
git commit -m "feat: add Settings tab panel and reconnect overlay HTML"
```

---

### Task 5: Add Settings tab JavaScript

**Files:**
- Modify: `lib/api/public/index.html`

- [ ] **Step 1: Add `switchTab` function**

Inside the `<script>` block, add:

```js
// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.querySelectorAll(".tab-btn")[name === "config" ? 0 : 1].classList.add("active");
  if (name === "settings") loadSettings();
}
```

- [ ] **Step 2: Add `loadSettings` function**

```js
// ── Settings ──────────────────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    document.getElementById("s-mqttUrl").value      = data.mqttUrl ?? "";
    document.getElementById("s-mqttUsername").value = data.mqttUsername ?? "";
    document.getElementById("s-mqttPassword").value = data.mqttPassword ?? "";
    document.getElementById("s-modbusPort").value   = data.modbusPort ?? 502;
    document.getElementById("settings-error").textContent = "";
  } catch {
    document.getElementById("settings-error").textContent = "載入設定失敗";
  }
}

function togglePassword() {
  const inp = document.getElementById("s-mqttPassword");
  inp.type = inp.type === "password" ? "text" : "password";
}
```

- [ ] **Step 3: Add `saveSettings` and reconnect-poll functions**

```js
async function saveSettings() {
  const errEl = document.getElementById("settings-error");
  errEl.textContent = "";

  const payload = {
    mqttUrl:      document.getElementById("s-mqttUrl").value.trim(),
    mqttUsername: document.getElementById("s-mqttUsername").value.trim(),
    mqttPassword: document.getElementById("s-mqttPassword").value,
    modbusPort:   parseInt(document.getElementById("s-modbusPort").value, 10),
  };

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || "儲存失敗"; return; }
    showReconnectOverlay();
  } catch {
    errEl.textContent = "網路錯誤，請確認服務是否正在運行";
  }
}

function showReconnectOverlay() {
  document.getElementById("reconnect-overlay").classList.remove("hidden");
  const start = Date.now();
  const TIMEOUT_MS = 30000;

  const poll = setInterval(async () => {
    if (Date.now() - start > TIMEOUT_MS) {
      clearInterval(poll);
      document.getElementById("reconnect-msg").textContent =
        "服務啟動逾時，請手動確認 Docker 容器狀態。";
      return;
    }
    try {
      await fetch("/api/settings");
      clearInterval(poll);
      document.getElementById("reconnect-msg").textContent = "服務已重新啟動 ✓";
      setTimeout(() => {
        document.getElementById("reconnect-overlay").classList.add("hidden");
        loadSettings();
      }, 2000);
    } catch {
      // still restarting, keep polling
    }
  }, 2000);
}
```

- [ ] **Step 4: Verify in browser**

Start the service, open `http://localhost:8080`, click the **設定** tab. Confirm:
- Fields load with current values from `settings.json`
- Clicking **顯示** toggles password visibility
- Submitting an empty URL shows an error from the API
- Submitting valid data triggers the reconnect overlay, then "服務已重新啟動 ✓" after Docker restart

- [ ] **Step 5: Commit**

```bash
git add lib/api/public/index.html
git commit -m "feat: settings tab JS — load, save, reconnect polling"
```
