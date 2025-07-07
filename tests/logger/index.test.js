const path = require("path");
const {
  Logger,
  LogLevel,
  createLogger,
  defaultLogger,
  PRESET_CONFIGS,
} = require("../../lib/logger");

describe("Logger Module", () => {
  describe("createLogger", () => {
    it("should create logger with development preset", () => {
      const logger = createLogger({
        preset: "development",
        name: "dev-test",
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.level).toBe(LogLevel.DEBUG);
      expect(logger.console).toBe(true);
      expect(logger.timestamp).toBe(true);
      expect(logger.logPath).toContain("dev-test.log");
    });

    it("should create logger with production preset", () => {
      const logger = createLogger({
        preset: "production",
        name: "prod-test",
      });

      expect(logger.level).toBe(LogLevel.INFO);
      expect(logger.console).toBe(false);
      expect(logger.timestamp).toBe(true);
    });

    it("should create logger with test preset", () => {
      const logger = createLogger({
        preset: "test",
        name: "test-test",
      });

      expect(logger.level).toBe(LogLevel.ERROR);
      expect(logger.console).toBe(true);
      expect(logger.timestamp).toBe(false);
    });

    it("should override preset configs with custom config", () => {
      const logger = createLogger({
        preset: "development",
        name: "custom-test",
        config: {
          level: LogLevel.WARN,
          console: false,
          timestamp: false,
        },
      });

      expect(logger.level).toBe(LogLevel.WARN);
      expect(logger.console).toBe(false);
      expect(logger.timestamp).toBe(false);
    });

    it("should use development preset for unknown preset", () => {
      const logger = createLogger({
        preset: "unknown",
        name: "unknown-test",
      });

      expect(logger.level).toBe(LogLevel.DEBUG);
      expect(logger.console).toBe(true);
      expect(logger.timestamp).toBe(true);
    });

    it("should create log file in correct location", () => {
      const name = "location-test";
      const logger = createLogger({ name });
      const expectedPath = path.join(process.cwd(), "logs", `${name}.log`);

      expect(logger.logPath).toBe(expectedPath);
    });
  });

  describe("PRESET_CONFIGS", () => {
    it("should have correct development config", () => {
      expect(PRESET_CONFIGS.development).toEqual({
        level: LogLevel.DEBUG,
        console: true,
        timestamp: true,
      });
    });

    it("should have correct production config", () => {
      expect(PRESET_CONFIGS.production).toEqual({
        level: LogLevel.INFO,
        console: false,
        timestamp: true,
      });
    });

    it("should have correct test config", () => {
      expect(PRESET_CONFIGS.test).toEqual({
        level: LogLevel.ERROR,
        console: true,
        timestamp: false,
      });
    });
  });

  describe("defaultLogger", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("should use development config in development environment", () => {
      process.env.NODE_ENV = "development";
      expect(defaultLogger.level).toBe(LogLevel.DEBUG);
    });

    it("should use production config in production environment", () => {
      process.env.NODE_ENV = "production";
      const prodLogger = createLogger({ preset: "production" });
      expect(prodLogger.level).toBe(LogLevel.INFO);
    });
  });
});
