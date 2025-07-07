const SwitchLogic = require("../../lib/deviceLogic/SwitchLogic");
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

describe("SwitchLogic", () => {
  let switchLogic;

  beforeEach(() => {
    switchLogic = new SwitchLogic();
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
  });

  describe("validateData", () => {
    test("should return true for valid JSON with function object", () => {
      const data = '{"function": {"channel1": true}}';
      expect(switchLogic.validateData(data)).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError for invalid JSON format", () => {
      const data = "{invalid json";
      expect(() => switchLogic.validateData(data)).toThrow(DeviceError);
      expect(() => switchLogic.validateData(data)).toThrow(
        "Invalid JSON format or data structure."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is missing", () => {
      const data = '{"key": "value"}';
      expect(() => switchLogic.validateData(data)).toThrow(DeviceError);
      expect(() => switchLogic.validateData(data)).toThrow(
        'Invalid switch data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is not an object", () => {
      const data = '{"function": "not_an_object"}';
      expect(() => switchLogic.validateData(data)).toThrow(DeviceError);
      expect(() => switchLogic.validateData(data)).toThrow(
        'Invalid switch data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("read method (integration with validateData and parseJSON)", () => {
    test("should successfully read and transform boolean values to 1/0", () => {
      const data =
        '{"function": {"channel1": true, "channel2": false, "channel3": "on"}}';
      const result = switchLogic.read(data);
      expect(result).toEqual({
        channel1: 1,
        channel2: 0,
        channel3: "on", // Non-boolean values should remain unchanged
      });
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe("write method (integration with transformWrite)", () => {
    test("should successfully transform 1 to true for write", () => {
      const result = switchLogic.write("channel1", 1);
      expect(result).toEqual({
        function: { channel1: true },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should successfully transform 0 to false for write", () => {
      const result = switchLogic.write("channel1", 0);
      expect(result).toEqual({
        function: { channel1: false },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should log warning for non-numeric value on write", () => {
      const result = switchLogic.write("channel1", "toggle");
      expect(result).toEqual({
        function: { channel1: "toggle" }, // Value remains unchanged if not 0 or 1
        cmd: "write",
        source: "vega-SDK",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'SwitchLogic: Writing non-numeric value "toggle" to channel "channel1".'
      );
    });
  });
});
