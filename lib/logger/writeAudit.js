const fs = require("fs");
const path = require("path");

const logDir = path.join(
  process.cwd(),
  "logs",
  process.env.NODE_ENV === "production" ? "prod" : "dev"
);
const csvPath = path.join(logDir, "write-audit.csv");

/**
 * 依檔案大小輪替 CSV，只保留最新 maxFiles 個舊檔
 * @param {number} maxSize - 最大檔案大小（bytes）
 * @param {number} maxFiles - 最多保留檔案數
 */
function rotate(maxSize = 5 * 1024 * 1024, maxFiles = 5) {
  if (!fs.existsSync(csvPath)) return;
  if (fs.statSync(csvPath).size <= maxSize) return;

  const baseName = path.basename(csvPath, ".csv");
  fs.renameSync(csvPath, path.join(logDir, `${baseName}_${Date.now()}.csv`));

  const files = fs
    .readdirSync(logDir)
    .filter((f) => f.startsWith(baseName + "_") && f.endsWith(".csv"))
    .sort(
      (a, b) =>
        fs.statSync(path.join(logDir, b)).mtimeMs -
        fs.statSync(path.join(logDir, a)).mtimeMs
    );
  files.slice(maxFiles).forEach((f) => fs.unlinkSync(path.join(logDir, f)));
}

/**
 * 記錄一筆外部 Modbus 寫入，供事後查詢 (時間/點位/寫入值)
 * @param {number} addr - Modbus 寄存器地址
 * @param {string} topic - 對應的 MQTT topic
 * @param {string} channel - 對應的 channel 名稱
 * @param {number} value - 寫入值
 */
function recordWrite(addr, topic, channel, value) {
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  rotate();
  if (!fs.existsSync(csvPath)) {
    fs.appendFileSync(csvPath, "time,addr,topic,channel,value\n");
  }
  // sv-SE 格式為 "YYYY-MM-DD HH:mm:ss"，用伺服器本機時區且不含逗號（避免破壞 CSV 欄位）
  const time = new Date().toLocaleString("sv-SE");
  // ponytail: no CSV escaping — fields are numeric addr/value or config-defined
  // topic/channel identifiers, never free-text. Add escaping if that changes.
  fs.appendFileSync(csvPath, `${time},${addr},${topic},${channel},${value}\n`);
}

module.exports = { recordWrite, rotate };
