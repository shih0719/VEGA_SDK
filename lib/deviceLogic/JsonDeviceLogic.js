const BaseDeviceLogic = require("./BaseDeviceLogic");
const { DeviceError, createError } = require("../errors");

class JsonDeviceLogic extends BaseDeviceLogic {
  constructor(config) {
    super();
    this.deviceType = config.deviceType;
    this._config = config;
    this._fieldMap = new Map((config.fields || []).map((f) => [f.name, f]));
  }

  validateData(data) {
    const parsed = this.parseJSON(data);
    return !!parsed.function && typeof parsed.function === "object";
  }

  /**
   * @override
   * 裝置除了控制指令（帶 "function" 屬性）外，也會發送其他類型的訊息
   * （例如心跳/狀態封包）。這類訊息不是錯誤，靜默跳過、不寫入 log。
   */
  read(data) {
    const parsed = this.parseJSON(data);
    if (!parsed.function || typeof parsed.function !== "object") {
      if (parsed.statistics?.timesOfFailed > 3) {
        return this._allChannelsOffline();
      }
      return {};
    }
    try {
      return this.transformRead(parsed);
    } catch (error) {
      this.logger.error("Error during device read operation", error);
      if (error instanceof DeviceError) {
        throw error;
      }
      throw createError(
        "device",
        `Failed to read device data: ${error.message}`,
        4002
      );
    }
  }

  /**
   * 心跳封包顯示連續失敗次數過多時，判定裝置離線，
   * 將此裝置所有輸出 register 設為 0xFFFF。
   */
  _allChannelsOffline() {
    const result = {};
    for (const [key, fieldCfg] of this._fieldMap) {
      const transform =
        fieldCfg.read ?? this._config.defaultTransform ?? "passthrough";
      if (transform === "skip") continue;
      if (transform === "scale_split32") {
        result[fieldCfg.highKey] = 0xffff;
        result[fieldCfg.lowKey] = 0xffff;
      } else {
        result[key] = 0xffff;
      }
    }
    return result;
  }

  transformRead(data) {
    const fn = data.function;
    const result = {};

    for (const [key, value] of Object.entries(fn)) {
      const fieldCfg = this._fieldMap.get(key);
      const transform =
        fieldCfg?.read ?? this._config.defaultTransform ?? "passthrough";

      if (transform === "skip") continue;

      if (transform === "boolean_to_int") {
        result[key] = value ? 1 : 0;
      } else if (transform === "scale") {
        result[key] = value * fieldCfg.scaleFactor;
      } else if (transform === "enum") {
        result[key] = fieldCfg.enumMap[String(value)] ?? value;
      } else if (transform === "scale_split32") {
        const scaled = Math.round(value * fieldCfg.scaleFactor);
        result[fieldCfg.highKey] = (scaled >>> 16) & 0xffff;
        result[fieldCfg.lowKey] = scaled & 0xffff;
      } else {
        result[key] = value;
      }
    }

    for (const [key, fieldCfg] of this._fieldMap) {
      const trigger = fieldCfg.zeroWhenFalse;
      if (trigger && trigger in fn && !fn[trigger]) {
        result[key] = 0;
      }
    }

    return result;
  }

  transformWrite(channel, value) {
    if (this._config.readOnly) {
      throw createError(
        "device",
        `Device type "${this.deviceType}" is read-only`,
        4011
      );
    }

    const fieldCfg = this._fieldMap.get(channel);
    const transform = fieldCfg?.write ?? "passthrough";

    let transformed;
    if (transform === "int_to_boolean") {
      transformed = value === 1;
    } else if (transform === "scale_inverse") {
      const factor = fieldCfg.writeScaleFactor ?? fieldCfg.scaleFactor;
      transformed = Math.round(value / factor);
    } else if (transform === "enum_reverse") {
      transformed = fieldCfg.writeEnumMap[String(value)] ?? value;
    } else if (transform === "assert_one_to_zero") {
      if (value !== 1) {
        throw createError(
          "device",
          `Invalid value for channel "${channel}": expected 1`,
          4012
        );
      }
      transformed = 0;
    } else {
      transformed = value;
    }

    return {
      function: { [channel]: transformed },
      cmd: "write",
      source: "vega-SDK",
    };
  }
}

module.exports = JsonDeviceLogic;
