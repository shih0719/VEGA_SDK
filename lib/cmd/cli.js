#!/usr/bin/env node

const { Command } = require("commander");
const readline = require("readline");
const chalk = require("chalk"); // 讓輸出更好看
const { defaultLogger: logger } = require("../logger"); // 引入 logger

// 確保在 pkg 打包的執行檔中 NODE_ENV 被正確設定
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development"; // 預設為開發環境
  logger.info("NODE_ENV 未設定，預設為開發環境。");
} else {
  logger.info(`在${process.env.NODE_ENV}模式下執行。`);
}
const fs = require("fs");
const path = require("path");
const CoreService = require("../core");
const config = require("../config");
const { createUIServer } = require("../api/server");
const MqttService = require("../services/MqttService");
const ModbusService = require("../services/ModbusService");
const deviceManager = require("../deviceLogic/DeviceManager");

const HOLDING_REGISTERS_FILE = path.join(__dirname, "../../configs/holding_registers.json");

function loadHoldingRegisters() {
  try {
    if (fs.existsSync(HOLDING_REGISTERS_FILE)) {
      const data = fs.readFileSync(HOLDING_REGISTERS_FILE, "utf8");
      logger.info("Loaded holdingRegisters from file.");
      return JSON.parse(data);
    }
  } catch (err) {
    logger.warn("Failed to load holdingRegisters, using default.", err);
  }
  return Array(300).fill(0);
}

function saveHoldingRegisters(registers) {
  try {
    fs.writeFileSync(HOLDING_REGISTERS_FILE, JSON.stringify(registers));
    logger.info("holdingRegisters saved to file.");
  } catch (err) {
    logger.error("Failed to save holdingRegisters.", err);
  }
}

const holdingRegisters = loadHoldingRegisters();
const mqttService   = new MqttService(config.mqtt);
const modbusService = new ModbusService(
  config.modbus,
  holdingRegisters,
  () => saveHoldingRegisters(holdingRegisters)
);

const Service = new CoreService(config, { mqttService, modbusService, deviceManager });

createUIServer(config.ui.port);
// --- Commander.js 設定 ---
const program = new Command();

program
  .name("my-interactive-cli")
  .description("一個簡單的互動式命令列工具範例")
  .version("1.0.0");

// 定義一個選項，例如 --verbose 或 -v
program.option("-v, --verbose", "啟用詳細輸出模式", false);

// 解析命令行參數
program.parse(process.argv);
const options = program.opts(); // 獲取解析後的選項

// --- Readline 互動式輸入設定 ---
// 創建 readline 介面，用於讀取標準輸入和寫入標準輸出
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.yellow(">> "), // 設定提示符號為黃色 '>> '
});

// --- 優雅關閉處理函數 ---
const gracefulShutdown = () => {
  logger.info("接收到終止訊號或結束命令，腳本正在關閉中...");
  // 確保 readline 介面被關閉，這會停止監聽輸入並釋放資源
  rl.close();

  // 在這裡執行其他重要的清理工作，例如：
  // - 關閉資料庫連接
  // - 保存任何未寫入的數據
  // - 停止後台服務或監聽器
  // ...

  // 給予短暫的時間確保所有同步日誌和清理操作完成
  setTimeout(() => {
    logger.info(chalk.green("腳本已優雅關閉。 👋"));
    process.exit(0); // 正常退出應用程式
  }, 100); // 100 毫秒通常足夠
};

// --- 註冊進程終止信號監聽器 ---
process.on("SIGINT", gracefulShutdown); // 監聽 Ctrl+C 訊號
process.on("SIGTERM", gracefulShutdown); // 監聽 kill 命令發送的終止訊號

// 處理未捕獲的異常，防止程式靜默崩潰
process.on("uncaughtException", (err) => {
  logger.error(`🚨 未捕獲的異常: ${err.message}`, err);
  process.exit(1); // 以錯誤碼退出
});

// 處理未處理的 Promise Rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`⚠️ 未處理的 Promise Rejection: ${reason}`, promise);
  process.exit(1); // 以錯誤碼退出
});

// --- 顯示幫助訊息 ---
const showHelp = () => {
  console.log(chalk.cyan("\n--- 命令列表 ---"));
  console.log(
    `  ${chalk.green("e")} 或 ${chalk.green("exit")} - ${chalk.white(
      "結束應用程式"
    )}`
  );
  console.log(
    `  ${chalk.green("h")} 或 ${chalk.green("help")} - ${chalk.white(
      "顯示此幫助訊息"
    )}`
  );
  console.log(
    `  ${chalk.yellow("任何其他輸入")} - ${chalk.white(
      "將被視為一般指令並處理"
    )}`
  );
  console.log(chalk.cyan("------------------\n"));
  rl.prompt(); // 再次顯示提示符號
};

// --- 處理使用者輸入事件 ---
rl.on("line", (line) => {
  const input = line.trim().toLowerCase(); // 移除前後空白並轉為小寫

  switch (input) {
    case "e":
    case "exit":
      logger.info('接收到 "e" 或 "exit" 命令，正在執行結束腳本...');
      gracefulShutdown(); // 呼叫優雅關閉函數
      break;
    case "h":
    case "help":
      showHelp();
      break;
    default:
      logger.info(`你輸入了: "${line}"`);
      // 在這裡可以添加你的主要 CLI 邏輯
      if (options.verbose) {
        logger.info(
          chalk.gray(`(詳細模式) 正在處理指令: ${line.toUpperCase()}`)
        );
      }
      // 舉例：簡單回應
      if (line.includes("hello")) {
        console.log(chalk.bgBlue.white("你好！很高興見到你。"));
      } else if (line.includes("time")) {
        console.log(
          chalk.yellow(`當前時間是: ${new Date().toLocaleTimeString("zh-TW")}`)
        );
      } else {
        console.log(
          chalk.gray('未識別的命令，請嘗試 "h" 或 "help" 獲取幫助。')
        );
      }
      break;
  }
  rl.prompt(); // 處理完畢後，再次顯示提示符號，等待下一個輸入
});

// --- 處理 readline 介面關閉事件 ---
// 當 rl.close() 被調用，或使用者按下 Ctrl+D (EOF) 時觸發
rl.on("close", () => {
  // 這裡通常不會直接執行 process.exit()，因為 gracefulShutdown 已經處理了
  // 它主要用於清理 readline 相關的資源
  logger.info("互動式介面已完全關閉。");
});

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
