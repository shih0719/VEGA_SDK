const BaseDeviceLogic = require("./BaseDeviceLogic");
const { createError } = require("../errors");

class JsonDeviceLogic extends BaseDeviceLogic {
  constructor(config) {
    super();
    this.deviceType = config.deviceType;
    this._config = config;
    this._fieldMap = new Map((config.fields || []).map((f) => [f.name, f]));
  }

  validateData(data) {
    const parsed = this.parseJSON(data);
    if (!parsed.function || typeof parsed.function !== "object") {
      throw createError(
        "device",
        `Missing or invalid "function" property for device type "${this.deviceType}"`,
        4010
      );
    }
    return true;
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
