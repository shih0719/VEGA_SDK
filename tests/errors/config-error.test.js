const { ConfigError } = require("../../lib/errors");

describe("ConfigError", () => {
  const errorMessage = "Configuration error message";
  const errorCode = ConfigError.CODES.INVALID_FORMAT;
  const configPath = "/path/to/config.json";

  it("should create config error with correct properties", () => {
    const error = new ConfigError(errorMessage, errorCode, configPath);

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.name).toBe("ConfigError");
    expect(error.configPath).toBe(configPath);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it("should serialize to JSON with config path", () => {
    const error = new ConfigError(errorMessage, errorCode, configPath);
    const json = error.toJSON();

    expect(json).toEqual({
      name: "ConfigError",
      message: errorMessage,
      code: errorCode,
      configPath: configPath,
      timestamp: error.timestamp,
      stack: error.stack,
    });
  });

  it("should have correct error codes defined", () => {
    expect(ConfigError.CODES).toEqual({
      INVALID_FORMAT: 3001,
      MISSING_REQUIRED: 3002,
      FILE_NOT_FOUND: 3003,
      VALIDATION_ERROR: 3004,
    });
  });

  it("should handle missing config path", () => {
    const error = new ConfigError(errorMessage, errorCode);

    expect(error.message).toBe(errorMessage);
    expect(error.code).toBe(errorCode);
    expect(error.configPath).toBeUndefined();
  });

  it("should handle all error code cases", () => {
    const testCases = [
      {
        code: ConfigError.CODES.INVALID_FORMAT,
        message: "Invalid configuration format",
      },
      {
        code: ConfigError.CODES.MISSING_REQUIRED,
        message: "Missing required configuration",
      },
      {
        code: ConfigError.CODES.FILE_NOT_FOUND,
        message: "Configuration file not found",
      },
      {
        code: ConfigError.CODES.VALIDATION_ERROR,
        message: "Configuration validation failed",
      },
    ];

    testCases.forEach(({ code, message }) => {
      const error = new ConfigError(message, code, configPath);
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.configPath).toBe(configPath);
    });
  });

  it("should work with different config paths", () => {
    const paths = [
      "/etc/app/config.json",
      "./config/local.json",
      "C:\\Program Files\\App\\config.yaml",
      "../settings.json",
    ];

    paths.forEach((path) => {
      const error = new ConfigError(errorMessage, errorCode, path);
      expect(error.configPath).toBe(path);
    });
  });

  it("should preserve error code type", () => {
    const error = new ConfigError(errorMessage, errorCode, configPath);
    expect(typeof error.code).toBe("number");
  });
});
