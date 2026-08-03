const fs = require("fs");
const path = require("path");

const logDir = path.join(
  process.cwd(),
  "logs",
  process.env.NODE_ENV === "production" ? "prod" : "dev"
);

/**
 * 建立一個依檔案大小輪替的 CSV 紀錄器
 * @param {string} filename - 檔名，例如 "write-audit.csv"
 * @param {string} header - CSV 標頭列（不含換行）
 */
function makeCsvLogger(filename, header) {
  const csvPath = path.join(logDir, filename);

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

  // ponytail: no CSV escaping — fields are numeric addr/value or config-defined
  // topic/channel identifiers, never free-text. Add escaping if that changes.
  function append(row) {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    rotate();
    if (!fs.existsSync(csvPath)) fs.appendFileSync(csvPath, header + "\n");
    const time = new Date().toLocaleString("sv-SE");
    fs.appendFileSync(csvPath, `${time},${row}\n`);
  }

  return { csvPath, append, rotate };
}

module.exports = { makeCsvLogger, logDir };
