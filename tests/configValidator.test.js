const { validateDeviceMap } = require("../lib/configValidator");
const ConfigError = require("../lib/errors/config-error");

describe("Config Validator", () => {
  describe("validateDeviceMap", () => {
    test("應該成功驗證有效的設備映射配置", () => {
      const validDeviceMap = [
        ["test/GW/DK1", { type: "switch", channels: { switch_ch1: 1 } }],
        [
          "test/GW/DK2",
          { type: "panel", channels: { switch_ch1: 2, button_id: 3 } },
        ],
        [
          "test/GW/DK3",
          { type: "aircondition", channels: { power_on: 4, temperature: 5 } },
        ],
      ];
      expect(() => validateDeviceMap(validDeviceMap)).not.toThrow();
    });

    test("應該在設備映射不是陣列時拋出 ConfigError", () => {
      const invalidDeviceMap = {};
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射配置必須是一個陣列"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.INVALID_FORMAT })
      );
    });

    test("應該在設備映射條目不是包含兩個元素的陣列時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: "switch", channels: { switch_ch1: 1 } }],
        ["invalid_entry"],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 1 必須是一個包含兩個元素的陣列"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.INVALID_FORMAT })
      );
    });

    test("應該在主題不是字串時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        [123, { type: "switch", channels: { switch_ch1: 1 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的主題必須是一個非空字串"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在主題是空字串時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["", { type: "switch", channels: { switch_ch1: 1 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的主題必須是一個非空字串"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在設備配置不是物件時拋出 ConfigError", () => {
      const invalidDeviceMap = [["test/GW/DK1", "invalid"]];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的設備配置必須是一個物件"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.INVALID_FORMAT })
      );
    });

    test("應該在設備類型不是字串時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: 123, channels: { switch_ch1: 1 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的設備類型必須是一個非空字串"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在設備類型是空字串時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: "", channels: { switch_ch1: 1 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的設備類型必須是一個非空字串"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在通道配置不是物件時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: "switch", channels: "invalid" }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的通道配置必須是一個物件"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.INVALID_FORMAT })
      );
    });

    test("應該在通道名稱不是字串時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: "switch", channels: { 123: 1 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的通道名稱必須是一個非空字串"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在通道地址不是正整數時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        [
          "test/GW/DK1",
          { type: "switch", channels: { switch_ch1: "invalid" } },
        ],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的通道地址 'switch_ch1' 必須是一個正整數"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });

    test("應該在通道地址是零或負數時拋出 ConfigError", () => {
      const invalidDeviceMap = [
        ["test/GW/DK1", { type: "switch", channels: { switch_ch1: 0 } }],
      ];
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(ConfigError);
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        "設備映射條目 0 的通道地址 'switch_ch1' 必須是一個正整數"
      );
      expect(() => validateDeviceMap(invalidDeviceMap)).toThrow(
        expect.objectContaining({ code: ConfigError.CODES.VALIDATION_ERROR })
      );
    });
  });
});
