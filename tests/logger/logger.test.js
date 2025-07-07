const path = require("path");
const fs = require("fs");
const { Logger, LogLevel } = require("../../lib/logger/logger");

describe("Logger", () => {
  let logger;
  let logPath;

  beforeEach(() => {
    logPath = getTestLogPath("test.log");
    logger = new Logger({
      logPath,
      level: LogLevel.DEBUG,
      console: false, // 禁用控制台輸出以避免測試輸出雜亂
      timestamp: true,
    });
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe("Constructor", () => {
    it("should create logger with default options", () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.level).toBe(LogLevel.INFO);
      expect(defaultLogger.console).toBe(true);
      expect(defaultLogger.timestamp).toBe(true);
    });

    it("should create logger with custom options", () => {
      expect(logger.level).toBe(LogLevel.DEBUG);
      expect(logger.console).toBe(false);
      expect(logger.timestamp).toBe(true);
      expect(logger.logPath).toBe(logPath);
    });

    it("should create log directory if it does not exist", () => {
      const customPath = getTestLogPath("custom/nested/test.log");
      new Logger({ logPath: customPath });
      expect(fs.existsSync(path.dirname(customPath))).toBe(true);
    });
  });

  describe("Log Levels", () => {
    it("should respect log level hierarchy", async () => {
      logger.setLevel(LogLevel.INFO);

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      // 等待日誌寫入
      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).not.toContain("DEBUG");
      expect(content).toContain("INFO");
      expect(content).toContain("WARN");
      expect(content).toContain("ERROR");
    });

    it("should handle error objects", async () => {
      const error = new Error("Test error");
      logger.error(error);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).toContain("Test error");
      expect(content).toContain("Error: Test error");
    });
  });

  describe("Timestamps", () => {
    it("should include timestamps when enabled", async () => {
      logger.info("Test message");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should not include timestamps when disabled", async () => {
      logger = new Logger({
        logPath,
        timestamp: false,
      });

      logger.info("Test message");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("File Operations", () => {
    it("should append to existing log file", async () => {
      const message1 = "First message";
      const message2 = "Second message";

      logger.info(message1);
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info(message2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).toContain(message1);
      expect(content).toContain(message2);
    });

    it("should clear log file", async () => {
      logger.info("Test message");
      await new Promise((resolve) => setTimeout(resolve, 100));

      await logger.clear();

      const content = fs.readFileSync(logPath, "utf8");
      expect(content).toBe("");
    });
  });

  describe("Console Output", () => {
    beforeEach(() => {
      restoreConsole();
      jest.spyOn(console, "log");
      jest.spyOn(console, "error");
      jest.spyOn(console, "warn");
      jest.spyOn(console, "debug");
    });

    it("should output to console when enabled", () => {
      logger = new Logger({
        logPath,
        console: true,
      });

      logger.info("Info message");
      logger.error("Error message");
      logger.warn("Warning message");
      logger.debug("Debug message");

      expect(console.log).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.debug).toHaveBeenCalled();
    });

    it("should not output to console when disabled", () => {
      logger = new Logger({
        logPath,
        console: false,
      });

      logger.info("Test message");

      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
