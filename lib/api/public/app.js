let configMap = []; // Array of [topic, {type, channels}]
let deviceTypes = [];

// ── Load ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [cfgRes, typesRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/device-types"),
    ]);
    configMap = await cfgRes.json();
    deviceTypes = await typesRes.json();
    populateTypeSelect("new-type");
    render();
    setStatus("就緒", "");
  } catch (e) {
    setStatus("載入失敗", "error");
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const list = document.getElementById("device-list");
  const empty = document.getElementById("empty-state");
  list.innerHTML = "";

  if (configMap.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  configMap.forEach(([topic, cfg], idx) => {
    list.appendChild(buildCard(idx, topic, cfg));
  });
}

function buildCard(idx, topic, cfg) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.idx = idx;

  const header = document.createElement("div");
  header.className = "card-header";
  header.innerHTML = `
    <span class="topic-label" title="${esc(topic)}">${esc(topic)}</span>
    <select class="badge" style="background:#1a1a2e;color:#fff;border:none;padding:2px 8px;border-radius:10px;font-size:0.75rem;" onchange="updateType(${idx}, this.value)">
      ${deviceTypes.map(t => `<option value="${t}" ${t === cfg.type ? "selected" : ""}>${t}</option>`).join("")}
    </select>
    <button class="btn-ghost" style="padding:4px 10px;font-size:0.8rem;" onclick="editTopic(${idx})">編輯 Topic</button>
    <button class="btn-danger" style="padding:4px 10px;font-size:0.8rem;" onclick="removeDevice(${idx})">刪除</button>
  `;

  const body = document.createElement("div");
  body.className = "card-body";

  const chanSection = document.createElement("div");
  chanSection.className = "channels-section";
  chanSection.innerHTML = `<div class="section-label">Channels（channel 名稱 → Modbus 暫存器位址）</div>`;

  const channels = cfg.channels || {};
  Object.entries(channels).forEach(([chName, addr]) => {
    chanSection.appendChild(buildChannelRow(idx, chName, addr));
  });

  const addBtn = document.createElement("button");
  addBtn.className = "btn-ghost add-channel-btn";
  addBtn.textContent = "＋ 新增 Channel";
  addBtn.onclick = () => addChannel(idx, chanSection, addBtn);

  chanSection.appendChild(addBtn);
  body.appendChild(chanSection);
  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function buildChannelRow(idx, chName, addr) {
  const row = document.createElement("div");
  row.className = "channel-row";
  row.innerHTML = `
    <input value="${esc(chName)}" placeholder="channel 名稱" oninput="updateChannelName(${idx}, this, '${esc(chName)}')" />
    <input type="number" value="${addr}" placeholder="位址" min="1" oninput="updateChannelAddr(${idx}, '${esc(chName)}', this)" />
    <button class="btn-danger" style="padding:5px 10px;font-size:0.8rem;" onclick="removeChannel(${idx}, '${esc(chName)}', this.closest('.channel-row'))">×</button>
  `;
  return row;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function updateType(idx, newType) {
  configMap[idx][1].type = newType;
}

function editTopic(idx) {
  const current = configMap[idx][0];
  const newTopic = prompt("修改 MQTT Topic：", current);
  if (newTopic === null) return;
  const trimmed = newTopic.trim();
  if (!trimmed) return alert("Topic 不可為空");
  if (configMap.some(([t], i) => i !== idx && t === trimmed)) return alert("Topic 已存在");
  configMap[idx][0] = trimmed;
  render();
}

function removeDevice(idx) {
  if (!confirm(`確定刪除「${configMap[idx][0]}」？`)) return;
  configMap.splice(idx, 1);
  render();
}

function updateChannelName(idx, input, oldName) {
  const newName = input.value.trim();
  const channels = configMap[idx][1].channels;
  if (!newName || newName === oldName) return;
  const val = channels[oldName];
  delete channels[oldName];
  channels[newName] = val;
  const row = input.closest(".channel-row");
  const addrInput = row.children[1];
  const delBtn = row.children[2];
  addrInput.oninput = () => updateChannelAddr(idx, newName, addrInput);
  delBtn.onclick = () => removeChannel(idx, newName, row);
  input.oninput = () => updateChannelName(idx, input, newName);
}

function updateChannelAddr(idx, chName, input) {
  const val = parseInt(input.value, 10);
  if (!isNaN(val) && val > 0) {
    configMap[idx][1].channels[chName] = val;
  }
}

function removeChannel(idx, chName, row) {
  delete configMap[idx][1].channels[chName];
  row.remove();
}

function addChannel(idx, section, addBtn) {
  const chName = `channel_${Date.now()}`;
  configMap[idx][1].channels[chName] = 1;
  const row = buildChannelRow(idx, chName, 1);
  section.insertBefore(row, addBtn);
  row.querySelector("input").focus();
  row.querySelector("input").select();
}

// ── Add Modal ─────────────────────────────────────────────────────────────────

function populateTypeSelect(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = deviceTypes.map(t => `<option value="${t}">${t}</option>`).join("");
}

function openAddModal() {
  document.getElementById("new-topic").value = "";
  document.getElementById("add-error").textContent = "";
  document.getElementById("add-modal").classList.add("open");
  document.getElementById("new-topic").focus();
}

function closeAddModal() {
  document.getElementById("add-modal").classList.remove("open");
}

function confirmAdd() {
  const topic = document.getElementById("new-topic").value.trim();
  const type  = document.getElementById("new-type").value;
  const errEl = document.getElementById("add-error");

  if (!topic) { errEl.textContent = "Topic 不可為空"; return; }
  if (configMap.some(([t]) => t === topic)) { errEl.textContent = "Topic 已存在"; return; }

  configMap.push([topic, { type, channels: {} }]);
  closeAddModal();
  render();
  const cards = document.querySelectorAll(".card");
  cards[cards.length - 1]?.scrollIntoView({ behavior: "smooth" });
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function saveConfig() {
  setStatus("儲存中…", "");
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configMap),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "儲存失敗");
    setStatus("已儲存 ✓", "saved");
    setTimeout(() => setStatus("就緒", ""), 3000);
  } catch (e) {
    setStatus("錯誤：" + e.message, "error");
  }
}

// ── Tab Navigation ────────────────────────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));

  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.add("active");

  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");

  if (tabName === "settings") loadSettings();
  if (tabName === "logic") loadDeviceLogic();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(text, cls) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = cls;
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

document.getElementById("add-modal").addEventListener("click", function(e) {
  if (e.target === this) closeAddModal();
});

document.getElementById("new-topic").addEventListener("keydown", function(e) {
  if (e.key === "Enter") confirmAdd();
});

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

function togglePassword() {
  const inp = document.getElementById("s-mqttPassword");
  const btn = inp.closest("div").querySelector("button");
  if (inp.type === "password") {
    inp.type = "text";
    btn.textContent = "隱藏";
  } else {
    inp.type = "password";
    btn.textContent = "顯示";
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

// ── Device Logic Editor ───────────────────────────────────────────────────────

let deviceLogicData = [];
let currentDeviceIdx = 0;

const READ_TRANSFORMS  = ['passthrough','skip','boolean_to_int','scale','enum','scale_split32'];
const WRITE_TRANSFORMS = ['passthrough','int_to_boolean','scale_inverse','enum_reverse','assert_one_to_zero'];

function setLogicMsg(msg, ok) {
  const el = document.getElementById('logic-error');
  el.textContent = msg;
  el.style.color = ok ? '#2d6a4f' : '#9b2226';
}

async function loadDeviceLogic() {
  setLogicMsg('');
  try {
    const res = await fetch('/api/device-logic');
    deviceLogicData = await res.json();
    currentDeviceIdx = 0;
    renderLogicDeviceSelect();
    renderLogicForm();
  } catch {
    setLogicMsg('載入失敗');
  }
}

function renderLogicDeviceSelect() {
  const sel = document.getElementById('logic-device-select');
  sel.innerHTML = deviceLogicData.map((d, i) =>
    `<option value="${i}"${i === currentDeviceIdx ? ' selected' : ''}>${esc(d.deviceType || '(未命名)')}</option>`
  ).join('');
}

function switchLogicDevice(idx) {
  currentDeviceIdx = idx;
  renderLogicForm();
}

function renderLogicForm() {
  const dev = deviceLogicData[currentDeviceIdx];
  if (!dev) { document.getElementById('logic-fields-body').innerHTML = ''; return; }
  document.getElementById('ld-type').value = dev.deviceType ?? '';
  document.getElementById('ld-readonly').checked = !!dev.readOnly;
  document.getElementById('ld-default-transform').value = dev.defaultTransform ?? '';
  renderFields();
}

function renderFields() {
  const dev = deviceLogicData[currentDeviceIdx];
  document.getElementById('logic-fields-body').innerHTML =
    (dev.fields || []).map((f, fi) => buildFieldRow(fi, f)).join('');
}

function buildFieldRow(fi, f) {
  const readTr  = f.read  ?? '';
  const writeTr = f.write ?? '';
  return `<div style="display:grid;grid-template-columns:150px 1fr 1fr 40px;gap:0;
                      border-bottom:1px solid #f0f0f0;align-items:start;">
    <div style="padding:10px 14px;">
      <input value="${esc(f.name ?? '')}" style="width:100%;"
        onblur="updateFieldName(${fi}, this.value)" />
    </div>
    <div style="padding:10px 14px;border-left:1px solid #f0f0f0;">
      <select style="width:100%;" onchange="updateReadTransform(${fi}, this.value)">
        <option value="">(無)</option>
        ${READ_TRANSFORMS.map(t => `<option value="${t}"${t===readTr?' selected':''}>${t}</option>`).join('')}
      </select>
      ${buildTransformParams(fi, 'read', readTr, f)}
    </div>
    <div style="padding:10px 14px;border-left:1px solid #f0f0f0;">
      <select style="width:100%;" onchange="updateWriteTransform(${fi}, this.value)">
        <option value="">(無)</option>
        ${WRITE_TRANSFORMS.map(t => `<option value="${t}"${t===writeTr?' selected':''}>${t}</option>`).join('')}
      </select>
      ${buildTransformParams(fi, 'write', writeTr, f)}
    </div>
    <div style="padding:10px 8px;border-left:1px solid #f0f0f0;text-align:center;">
      <button onclick="removeLogicField(${fi})"
        style="padding:4px 8px;background:#9b2226;color:#fff;border:none;border-radius:5px;cursor:pointer;">×</button>
    </div>
  </div>`;
}

function buildTransformParams(fi, side, transform, f) {
  if (transform === 'scale') {
    return `<div style="margin-top:6px;font-size:0.8rem;">
      Factor: <input type="number" value="${f.scaleFactor ?? 1}" style="width:72px;"
        oninput="updateFieldParam(${fi},'scaleFactor',parseFloat(this.value)||1)" />
    </div>`;
  }
  if (transform === 'scale_inverse') {
    const val = f.writeScaleFactor ?? f.scaleFactor ?? 1;
    return `<div style="margin-top:6px;font-size:0.8rem;">
      Factor: <input type="number" value="${val}" style="width:72px;"
        oninput="updateFieldParam(${fi},'writeScaleFactor',parseFloat(this.value)||1)" />
    </div>`;
  }
  if (transform === 'scale_split32') {
    return `<div style="margin-top:6px;font-size:0.8rem;display:flex;flex-direction:column;gap:4px;">
      <div>Factor: <input type="number" value="${f.scaleFactor??1}" style="width:72px;"
        oninput="updateFieldParam(${fi},'scaleFactor',parseFloat(this.value)||1)" /></div>
      <div>High key: <input value="${esc(f.highKey??'')}" style="width:120px;"
        oninput="updateFieldParam(${fi},'highKey',this.value)" /></div>
      <div>Low key: <input value="${esc(f.lowKey??'')}" style="width:120px;"
        oninput="updateFieldParam(${fi},'lowKey',this.value)" /></div>
    </div>`;
  }
  if (transform === 'enum' || transform === 'enum_reverse') {
    const mapKey = transform === 'enum' ? 'enumMap' : 'writeEnumMap';
    const pairs  = Object.entries(f[mapKey] ?? {});
    const rows   = pairs.map((_, pi) => buildEnumPairRow(fi, side, mapKey, pairs, pi)).join('');
    return `<div style="margin-top:6px;">
      <div style="font-size:0.73rem;color:#888;margin-bottom:3px;">key → value</div>
      <div id="ep-${fi}-${side}">${rows}</div>
      <button onclick="addEnumPair(${fi},'${side}','${mapKey}')"
        style="font-size:0.75rem;padding:2px 8px;background:#e0e0e0;border:none;
               border-radius:4px;cursor:pointer;margin-top:4px;">＋</button>
    </div>`;
  }
  return '';
}

function buildEnumPairRow(fi, side, mapKey, pairs, pi) {
  const [k, v] = pairs[pi];
  return `<div style="display:flex;gap:4px;align-items:center;margin-bottom:3px;">
    <input value="${esc(String(k))}" style="width:72px;font-size:0.78rem;"
      onblur="updateEnumKey(${fi},'${side}','${mapKey}',${pi},this.value)" />
    <span style="color:#aaa;font-size:0.8rem;">→</span>
    <input value="${esc(String(v))}" style="width:72px;font-size:0.78rem;"
      onblur="updateEnumVal(${fi},'${side}','${mapKey}',${pi},this.value)" />
    <button onclick="removeEnumPair(${fi},'${side}','${mapKey}',${pi})"
      style="padding:0 5px;background:#e0e0e0;border:none;border-radius:3px;cursor:pointer;font-size:0.85rem;">×</button>
  </div>`;
}

// ── Meta & field mutations ────────────────────────────────────────────────────

function updateDeviceMeta() {
  const dev = deviceLogicData[currentDeviceIdx];
  if (!dev) return;
  const newType = document.getElementById('ld-type').value.trim();
  dev.deviceType = newType;
  dev.readOnly   = document.getElementById('ld-readonly').checked;
  const dt = document.getElementById('ld-default-transform').value;
  if (dt) dev.defaultTransform = dt; else delete dev.defaultTransform;
  renderLogicDeviceSelect();
}

function updateFieldName(fi, val) {
  deviceLogicData[currentDeviceIdx].fields[fi].name = val.trim();
}

function updateReadTransform(fi, val) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  f.read = val || undefined;
  renderFields();
}

function updateWriteTransform(fi, val) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  f.write = val || undefined;
  renderFields();
}

function updateFieldParam(fi, key, val) {
  deviceLogicData[currentDeviceIdx].fields[fi][key] = val;
}

function updateEnumKey(fi, side, mapKey, pi, newKey) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  const pairs = Object.entries(f[mapKey] ?? {});
  if (!pairs[pi]) return;
  const oldKey = pairs[pi][0];
  const val    = pairs[pi][1];
  const newMap = {};
  pairs.forEach(([k, v], i) => { newMap[i === pi ? newKey : k] = v; });
  delete newMap[oldKey];
  f[mapKey] = newMap;
  renderFields();
}

function updateEnumVal(fi, side, mapKey, pi, raw) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  const pairs = Object.entries(f[mapKey] ?? {});
  if (!pairs[pi]) return;
  const key = pairs[pi][0];
  let val;
  try { val = JSON.parse(raw); } catch { val = raw; }
  f[mapKey][key] = val;
}

function addEnumPair(fi, side, mapKey) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  if (!f[mapKey]) f[mapKey] = {};
  const newKey = 'key' + Object.keys(f[mapKey]).length;
  f[mapKey][newKey] = '';
  renderFields();
}

function removeEnumPair(fi, side, mapKey, pi) {
  const f = deviceLogicData[currentDeviceIdx].fields[fi];
  const pairs = Object.entries(f[mapKey] ?? {});
  if (!pairs[pi]) return;
  delete f[mapKey][pairs[pi][0]];
  renderFields();
}

function addLogicField() {
  const dev = deviceLogicData[currentDeviceIdx];
  if (!dev) return;
  dev.fields.push({ name: '', read: 'passthrough' });
  renderFields();
}

function removeLogicField(fi) {
  deviceLogicData[currentDeviceIdx].fields.splice(fi, 1);
  renderFields();
}

function addLogicDevice() {
  deviceLogicData.push({ deviceType: 'new_device', readOnly: false, fields: [] });
  currentDeviceIdx = deviceLogicData.length - 1;
  renderLogicDeviceSelect();
  renderLogicForm();
}

function deleteLogicDevice() {
  if (deviceLogicData.length <= 1) { setLogicMsg('至少需保留一個設備定義'); return; }
  if (!confirm(`確定刪除「${deviceLogicData[currentDeviceIdx].deviceType}」？`)) return;
  deviceLogicData.splice(currentDeviceIdx, 1);
  currentDeviceIdx = Math.min(currentDeviceIdx, deviceLogicData.length - 1);
  renderLogicDeviceSelect();
  renderLogicForm();
}

async function saveDeviceLogic() {
  setLogicMsg('');
  try {
    const res = await fetch('/api/device-logic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceLogicData),
    });
    const data = await res.json();
    if (!res.ok) { setLogicMsg(data.error || '儲存失敗'); return; }
    setLogicMsg('已儲存並重新載入 ✓', true);
    setTimeout(() => setLogicMsg(''), 3000);
  } catch {
    setLogicMsg('網路錯誤');
  }
}

init();
