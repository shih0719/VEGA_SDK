const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { defaultLogger: logger } = require("../lib/logger");

module.exports = (Service) => {
  // API 端點來修改 .env
  router.post("/env", (req, res) => {
    const envPath = path.resolve(__dirname, "../.env");
    fs.readFile(envPath, "utf8", (err, data) => {
      if (err) {
        logger.error("Error reading .env:", err);
        return res.status(500).send("Failed to read .env.");
      }

      let lines = data.split("\n");
      const updatedKeys = [];

      // 定義允許透過 header 修改的環境變數列表
      const allowedEnvKeys = [
        "MQTT_URL",
        "MQTT_CLIENT_ID",
        "MQTT_USERNAME",
        "MQTT_PASSWORD",
        "MQTT_RECONNECT_PERIOD",
        "MQTT_CONNECT_TIMEOUT",
        "MQTT_KEEPALIVE",
        "MODBUS_HOST",
        "MODBUS_PORT",
      ];

      // 遍歷允許的鍵，檢查對應的 header 是否存在且有值
      for (const key of allowedEnvKeys) {
        // 將 header 名稱轉換為小寫，因為 HTTP header 名稱通常是大小寫不敏感的
        const headerValue = req.headers[key.toLowerCase()];

        if (
          headerValue !== undefined &&
          headerValue !== null &&
          headerValue !== ""
        ) {
          let found = false;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(`${key}=`)) {
              lines[i] = `${key}=${headerValue}`;
              found = true;
              break;
            }
          }

          if (!found) {
            lines.push(`${key}=${headerValue}`);
          }
          updatedKeys.push(`${key}=${headerValue}`);
        }
      }

      if (updatedKeys.length === 0) {
        return res
          .status(200) // 這裡改為 200，表示沒有錯誤，只是沒有更新
          .send("No environment variables updated: No valid headers provided.");
      }

      fs.writeFile(envPath, lines.join("\n"), "utf8", async (err) => {
        // 添加 async
        if (err) {
          logger.error("Error writing env:", err);
          return res.status(500).send("Failed to write .env.");
        }
        res.send(`.env updated: ${updatedKeys.join(", ")}`);
        logger.info(".env updated, restarting service...");
        try {
          await Service.restart(); // 觸發服務重啟
          logger.info("Service restarted successfully after .env update.");
        } catch (restartErr) {
          logger.error(
            "Failed to restart service after .env update:",
            restartErr
          );
        }
      });
    });
  });

  // API 端點來讀取 .env
  router.get("/env", (req, res) => {
    const envPath = path.resolve(__dirname, "../.env");
    fs.readFile(envPath, "utf8", (err, data) => {
      if (err) {
        logger.error("Error reading .env:", err);
        return res.status(500).send("Failed to read .env.");
      }
      res.send(data);
    });
  });

  // API 端點來讀取 config_map.json
  router.get("/config_map", (req, res) => {
    const configMapPath = path.resolve(__dirname, "../config_map.json");
    fs.readFile(configMapPath, "utf8", (err, data) => {
      if (err) {
        logger.error("Error reading config_map.json:", err);
        return res.status(500).send("Failed to read config_map.json.");
      }
      try {
        const config = JSON.parse(data);
        res.json(config);
      } catch (parseErr) {
        logger.error("Error parsing config_map.json:", parseErr);
        res.status(500).send("Failed to parse config_map.json.");
      }
    });
  });

  // API 端點來匯入 config_map.json
  router.post("/config_map", (req, res) => {
    const newConfigMap = req.body;
    if (typeof newConfigMap !== "object" || newConfigMap === null) {
      return res.status(400).send("Invalid config map data.");
    }

    const configMapPath = path.resolve(__dirname, "../config_map.json");
    fs.writeFile(
      configMapPath,
      JSON.stringify(newConfigMap, null, 2),
      "utf8",
      async (err) => {
        // 添加 async
        if (err) {
          logger.error("Error writing config_map.json:", err);
          return res.status(500).send("Failed to write config_map.json.");
        }
        res.send("config_map.json updated successfully.");
        logger.info("config_map.json updated, restarting service...");
        try {
          await Service.restart(); // 觸發服務重啟
          logger.info(
            "Service restarted successfully after config_map.json update."
          );
        } catch (restartErr) {
          logger.error(
            "Failed to restart service after config_map.json update:",
            restartErr
          );
        }
      }
    );
  });

  return router;
};
