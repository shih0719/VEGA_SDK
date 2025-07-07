const {
  BaseError,
  DeviceError,
  ServiceError,
  ConfigError,
  isCustomError,
  createError,
} = require("../../lib/errors");

describe("Errors Module", () => {
  describe("isCustomError", () => {
    it("should identify custom errors correctly", () => {
      const customErrors = [
        new BaseError("Base error", 1000),
        new DeviceError("Device error", 1001, "switch"),
        new ServiceError("Service error", 2001, "MQTT"),
        new ConfigError("Config error", 3001, "/config.json"),
      ];

      customErrors.forEach((error) => {
        expect(isCustomError(error)).toBe(true);
      });
    });

    it("should identify non-custom errors correctly", () => {
      const nonCustomErrors = [
        new Error("Standard error"),
        new TypeError("Type error"),
        { message: "Not an error" },
        null,
        undefined,
      ];

      nonCustomErrors.forEach((error) => {
        expect(isCustomError(error)).toBe(false);
      });
    });
  });

  describe("createError", () => {
    const message = "Test error";
    const deviceType = "switch";
    const serviceName = "MQTT";
    const configPath = "/config.json";

    it("should create device error correctly", () => {
      const error = createError("device", message, 1001, { deviceType });

      expect(error).toBeInstanceOf(DeviceError);
      expect(error.message).toBe(message);
      expect(error.deviceType).toBe(deviceType);
    });

    it("should create service error correctly", () => {
      const error = createError("service", message, 2001, { serviceName });

      expect(error).toBeInstanceOf(ServiceError);
      expect(error.message).toBe(message);
      expect(error.serviceName).toBe(serviceName);
    });

    it("should create config error correctly", () => {
      const error = createError("config", message, 3001, { configPath });

      expect(error).toBeInstanceOf(ConfigError);
      expect(error.message).toBe(message);
      expect(error.configPath).toBe(configPath);
    });

    it("should create base error for unknown type", () => {
      const error = createError("unknown", message, 1000);

      expect(error).toBeInstanceOf(BaseError);
      expect(error.message).toBe(message);
    });

    it("should handle case-insensitive type", () => {
      const types = ["DEVICE", "Service", "CONFIG", "Unknown"];
      const expectedClasses = [
        DeviceError,
        ServiceError,
        ConfigError,
        BaseError,
      ];

      types.forEach((type, index) => {
        const error = createError(type, message, 1000);
        expect(error).toBeInstanceOf(expectedClasses[index]);
      });
    });

    it("should handle missing details", () => {
      const error = createError("device", message, 1001);

      expect(error).toBeInstanceOf(DeviceError);
      expect(error.message).toBe(message);
      expect(error.deviceType).toBeUndefined();
    });
  });
});
