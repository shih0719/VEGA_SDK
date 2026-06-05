const http = require("http");
const fs = require("fs");
const path = require("path");
const { validateDeviceMap } = require("../configValidator");
const { defaultLogger: logger } = require("../logger");

const CONFIG_MAP_PATH = path.resolve(__dirname, "../../configs/config_map.json");
const SETTINGS_PATH = path.resolve(__dirname, "../../configs/settings.json");
const PUBLIC_PATH = path.resolve(__dirname, "public");
const DEVICE_TYPES = ["switch", "panel", "aircondition", "HPD", "meter"];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost`);

  // API routes
  if (url.pathname === "/api/config" && req.method === "GET") {
    try {
      const raw = fs.readFileSync(CONFIG_MAP_PATH, "utf8");
      send(res, 200, JSON.parse(raw));
    } catch (err) {
      send(res, 500, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/config" && req.method === "POST") {
    try {
      const data = await readBody(req);
      validateDeviceMap(data);
      fs.writeFileSync(CONFIG_MAP_PATH, JSON.stringify(data, null, 2));
      send(res, 200, { ok: true });
    } catch (err) {
      send(res, 400, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/device-types" && req.method === "GET") {
    send(res, 200, DEVICE_TYPES);
    return;
  }

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
      if (!existing.mqtt?.options || !existing.modbus) {
        send(res, 500, { error: 'settings.json 結構不完整，請手動修復' });
        return;
      }
      existing.mqtt.url = mqttUrl;
      existing.mqtt.options.username = mqttUsername;
      existing.mqtt.options.password = mqttPassword;
      existing.modbus.port = port;
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(existing, null, 2));

      res.on('finish', () => setTimeout(() => process.exit(0), 100));
      send(res, 200, { ok: true });
    } catch (err) {
      send(res, 400, { error: err.message });
    }
    return;
  }

  // Static files
  if (url.pathname === "/" || url.pathname === "/index.html") {
    serveFile(res, path.join(PUBLIC_PATH, "index.html"), "text/html; charset=utf-8");
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

function createUIServer(port) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      logger.error("UI server error:", err);
      res.writeHead(500);
      res.end("Internal server error");
    });
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info(`UI server started at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    logger.error("UI server failed to start:", err);
  });

  return server;
}

module.exports = { createUIServer };
