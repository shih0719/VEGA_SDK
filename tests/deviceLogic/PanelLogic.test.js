const PanelLogic = require("../../lib/deviceLogic/PanelLogic");
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

describe("PanelLogic", () => {
  let panelLogic;

  beforeEach(() => {
    panelLogic = new PanelLogic();
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
  });

  describe("validateData", () => {
    test("should return true for valid JSON with function object", () => {
      const data = '{"function": {"switch_ch1": true}}';
      expect(panelLogic.validateData(data)).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should throw DeviceError for invalid JSON format", () => {
      const data = "{invalid json";
      expect(() => panelLogic.validateData(data)).toThrow(DeviceError);
      expect(() => panelLogic.validateData(data)).toThrow(
        "Invalid JSON format or data structure."
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is missing", () => {
      const data = '{"key": "value"}';
      expect(() => panelLogic.validateData(data)).toThrow(DeviceError);
      expect(() => panelLogic.validateData(data)).toThrow(
        'Invalid panel data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    test("should throw DeviceError if function property is not an object", () => {
      const data = '{"function": "not_an_object"}';
      expect(() => panelLogic.validateData(data)).toThrow(DeviceError);
      expect(() => panelLogic.validateData(data)).toThrow(
        'Invalid panel data format: missing or invalid "function" object.'
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("read method (integration with validateData and parseJSON)", () => {
    test("should successfully read and transform valid panel data", () => {
      const data = '{"function": {"switch_ch1": true, "button_id": 5}}';
      const result = panelLogic.read(data);
      expect(result).toEqual({
        switch_ch1: 1,
        button_id: 50,
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    test("should handle invalid number for button_id", () => {
      const data = '{"function": {"button_id": "abc"}}';
      const result = panelLogic.read(data);
      expect(result).toEqual({ button_id: "abc" });
      expect(logger.warn).toHaveBeenCalledWith(
        'PanelLogic: Invalid number for button_id: "abc".'
      );
    });
  });

  describe("write method (integration with transformWrite)", () => {
    test("should successfully transform switch_ch1 for write (value 1)", () => {
      const result = panelLogic.write("switch_ch1", 1);
      expect(result).toEqual({
        function: { switch_ch1: true },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should successfully transform switch_ch1 for write (value 0)", () => {
      const result = panelLogic.write("switch_ch1", 0);
      expect(result).toEqual({
        function: { switch_ch1: false },
        cmd: "write",
        source: "vega-SDK",
      });
    });

    test("should handle button_id without special transformation", () => {
      const result = panelLogic.write("button_id", 123);
      expect(result).toEqual({
        function: { button_id: 123 },
        cmd: "write",
        source: "vega-SDK",
      });
      expect(logger.warn).not.toHaveBeenCalled(); // No warning expected for handled channels
    });

    test("should log warning for unhandled channel on write", () => {
      const result = panelLogic.write("unhandled_channel", "test_value");
      expect(result).toEqual({
        function: { unhandled_channel: "test_value" },
        cmd: "write",
        source: "vega-SDK",
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'PanelLogic: Writing to unhandled channel "unhandled_channel" with value "test_value".'
      );
    });
  });
});
