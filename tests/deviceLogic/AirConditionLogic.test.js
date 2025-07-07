const AirConditionLogic = require("../../lib/deviceLogic/AirConditionLogic");
const { DeviceError } = require("../../lib/errors");
const { defaultLogger: logger } = require("../../lib/logger");

jest.mock("../../lib/logger", () => ({
  defaultLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("AirConditionLogic", () => {
  let airConditionLogic;

  beforeEach(() => {
    airConditionLogic = new AirConditionLogic();
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
  });

  describe("validateData", () => {
    test("should return true for valid JSON with function object", () => {
      const data = '{"function": {"model": "cold"}}';
      expect(airConditionLogic.validateData(data)).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError for invalid JSON format", () => {
      const data = "{invalid json";
      expect(() => airConditionLogic.validateData(data)).toThrow(DeviceError);
      expect(() => airConditionLogic.validateData(data)).toThrow(
        "Invalid JSON format or data structure."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is missing", () => {
      const data = '{"key": "value"}';
      expect(() => airConditionLogic.validateData(data)).toThrow(DeviceError);
      expect(() => airConditionLogic.validateData(data)).toThrow(
        'Invalid aircondition data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is not an object", () => {
      const data = '{"function": "not_an_object"}';
      expect(() => airConditionLogic.validateData(data)).toThrow(DeviceError);
      expect(() => airConditionLogic.validateData(data)).toThrow(
        'Invalid aircondition data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("read method (integration with validateData and parseJSON)", () => {
    test("should successfully read and transform valid aircondition data", () => {
      const data =
        '{"function": {"model": "cold", "rev_speed": "low", "temperature": 25, "power_on": true, "current_temp": 26.5, "humidness": 60}}';
      const result = airConditionLogic.read(data);
      expect(result).toEqual({
        model: 0,
        rev_speed: 1,
        temperature: 250,
        power_on: 1,
        current_temp: 265,
        humidness: 600,
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should handle unknown model value gracefully", () => {
      const data = '{"function": {"model": "unknown"}}';
      const result = airConditionLogic.read(data);
      expect(result).toEqual({ model: "unknown" });
      expect(logger.warn).toHaveBeenCalledWith(
        'AirConditionLogic: Unknown model value "unknown".'
      );
    });

    test("should handle invalid number for temperature", () => {
      const data = '{"function": {"temperature": "abc"}}';
      const result = airConditionLogic.read(data);
      expect(result).toEqual({ temperature: "abc" });
      expect(logger.warn).toHaveBeenCalledWith(
        'AirConditionLogic: Invalid number for temperature: "abc".'
      );
    });
  });

  describe("write method (integration with transformWrite)", () => {
    test("should successfully transform power_on for write", () => {
      const result = airConditionLogic.write("power_on", 1);
      expect(result).toEqual({
        function: { power_on: true },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should successfully transform model for write", () => {
      const result = airConditionLogic.write("model", 0); // 0 for cold
      expect(result).toEqual({
        function: { model: "cold" },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should throw DeviceError for invalid model value on write", () => {
      expect(() => airConditionLogic.write("model", 99)).toThrow(DeviceError);
      expect(() => airConditionLogic.write("model", 99)).toThrow(
        "AirConditionLogic: Invalid model value for write: 99"
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should successfully transform temperature for write", () => {
      const result = airConditionLogic.write("temperature", 250); // 25.0 * 10
      expect(result).toEqual({
        function: { temperature: 25 },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should throw DeviceError for invalid temperature value on write", () => {
      expect(() => airConditionLogic.write("temperature", "abc")).toThrow(
        DeviceError
      );
      expect(() => airConditionLogic.write("temperature", "abc")).toThrow(
        "AirConditionLogic: Invalid temperature value for write: abc"
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should successfully transform rev_speed for write", () => {
      const result = airConditionLogic.write("rev_speed", 1); // 1 for low
      expect(result).toEqual({
        function: { rev_speed: "low" },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should throw DeviceError for invalid rev_speed value on write", () => {
      expect(() => airConditionLogic.write("rev_speed", 99)).toThrow(
        DeviceError
      );
      expect(() => airConditionLogic.write("rev_speed", 99)).toThrow(
        "AirConditionLogic: Invalid rev_speed value for write: 99"
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should log warning for unhandled channel on write", () => {
      const result = airConditionLogic.write("unhandled_channel", 123);
      expect(result).toEqual({
        function: { unhandled_channel: 123 },
        cmd: "write",
        source: "vega-SDK",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'AirConditionLogic: Writing to unhandled channel "unhandled_channel" with value "123".'
      );
    });
  });
});
