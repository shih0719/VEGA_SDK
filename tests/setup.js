const path = require("path");
const fs = require("fs");

// 創建臨時測試日誌目錄
const testLogsDir = path.join(process.cwd(), "tests", "logs");
if (!fs.existsSync(testLogsDir)) {
  fs.mkdirSync(testLogsDir, { recursive: true });
}

// 每個測試後清理操作
afterEach(() => {
  // 清理臨時日誌文件
  const files = fs.readdirSync(testLogsDir);
  files.forEach((file) => {
    fs.unlinkSync(path.join(testLogsDir, file));
  });
});

// 所有測試完成後的清理操作
afterAll(() => {
  // 移除臨時日誌目錄
  if (fs.existsSync(testLogsDir)) {
    fs.rmdirSync(testLogsDir, { recursive: true });
  }
});

// 全局測試工具函數
global.getTestLogPath = (filename) => {
  return path.join(testLogsDir, filename);
};

// 禁用控制台輸出（在測試中）
global.suppressConsole = () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "debug").mockImplementation(() => {});
};

// 恢復控制台輸出
global.restoreConsole = () => {
  console.log.mockRestore();
  console.error.mockRestore();
  console.warn.mockRestore();
  console.debug.mockRestore();
};
