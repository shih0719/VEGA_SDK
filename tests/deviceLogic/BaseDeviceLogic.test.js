const BaseDeviceLogic = require("../../lib/deviceLogic/BaseDeviceLogic");
const { DeviceError, createError } = require("../../lib/errors");
const { defaultLogger: logger } = require("../../lib/logger");

// Mock logger to prevent actual console output during tests
jest.mock("../../lib/logger", () => ({
  defaultLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("BaseDeviceLogic", () => {
  // Clear mocks before each test
  beforeEach(() => {
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
  });

  test("should not be able to instantiate BaseDeviceLogic directly", () => {
    expect(() => new BaseDeviceLogic()).toThrow(TypeError);
    expect(() => new BaseDeviceLogic()).toThrow(
      "Cannot construct BaseDeviceLogic instances directly."
    );
  });

  class ConcreteDeviceLogic extends BaseDeviceLogic {
    constructor() {
      super();
      this.deviceType = "concrete";
    }
    validateData(data) {
      if (typeof data !== "string" || data.length === 0) {
        throw createError("device", "Invalid data format.", 4000, {
          deviceType: this.deviceType,
        });
      }
      return true;
    }
    transformRead(data) {
      if (!data || typeof data !== "object" || !data.value) {
        throw createError("device", "Invalid data for transformRead.", 4001, {
          deviceType: this.deviceType,
        });
      }
      return { transformedValue: data.value * 2 };
    }
    transformWrite(channel, value) {
      if (channel !== "testChannel" || typeof value !== "number") {
        throw createError(
          "device",
          "Invalid channel or value for transformWrite.",
          4002,
          { deviceType: this.deviceType }
        );
      }
      return { [channel]: value / 2 };
    }
  }

  let concreteLogic;
  beforeEach(() => {
    concreteLogic = new ConcreteDeviceLogic();
  });

  describe("parseJSON", () => {
    test("should parse valid JSON string", () => {
      const jsonString = '{"key": "value", "number": 123}';
      const result = concreteLogic.parseJSON(jsonString);
      expect(result).toEqual({ key: "value", number: 123 });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError for invalid JSON format", () => {
      const invalidJson = "{invalid json";
      expect(() => concreteLogic.parseJSON(invalidJson)).toThrow(DeviceError);
      expect(() => concreteLogic.parseJSON(invalidJson)).toThrow(
        "Invalid JSON format"
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if parsed data is not an object", () => {
      const invalidJson = '"just a string"';
      expect(() => concreteLogic.parseJSON(invalidJson)).toThrow(DeviceError);
      expect(() => concreteLogic.parseJSON(invalidJson)).toThrow(
        "Parsed JSON data is not a valid object."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("read method", () => {
    test("should successfully read and transform data", () => {
      const data = '{"value": 10}';
      const result = concreteLogic.read(data);
      expect(result).toEqual({ transformedValue: 20 });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError if validateData fails", () => {
      const invalidData = "";
      expect(() => concreteLogic.read(invalidData)).toThrow(DeviceError);
      expect(() => concreteLogic.read(invalidData)).toThrow(
        "Invalid data format."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if parseJSON fails", () => {
      const invalidJson = "{invalid json";
      expect(() => concreteLogic.read(invalidJson)).toThrow(DeviceError);
      expect(() => concreteLogic.read(invalidJson)).toThrow(
        "Invalid JSON format"
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if transformRead fails", () => {
      const data = '{"wrongKey": 10}'; // Missing 'value' key for transformRead
      expect(() => concreteLogic.read(data)).toThrow(DeviceError);
      expect(() => concreteLogic.read(data)).toThrow(
        "Invalid data for transformRead."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("write method", () => {
    test("should successfully write and transform data", () => {
      const channel = "testChannel";
      const value = 100;
      const result = concreteLogic.write(channel, value);
      expect(result).toEqual({ [channel]: 50 });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError if transformWrite fails", () => {
      const channel = "wrongChannel";
      const value = 100;
      expect(() => concreteLogic.write(channel, value)).toThrow(DeviceError);
      expect(() => concreteLogic.write(channel, value)).toThrow(
        "Invalid channel or value for transformWrite."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
