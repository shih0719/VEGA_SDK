const ConfigError = require("./errors/config-error");

/**
 * 驗證設備映射配置
 * @param {Array<Array<any>>} deviceMap - 設備映射配置
 * @returns {void}
 * @throws {ConfigError} 如果配置無效
 */
function validateDeviceMap(deviceMap) {
  if (!Array.isArray(deviceMap)) {
    throw new ConfigError(
      "設備映射配置必須是一個陣列",
      ConfigError.CODES.INVALID_FORMAT,
      "config_map.json"
    );
  }

  for (const [index, entry] of deviceMap.entries()) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new ConfigError(
        `設備映射條目 ${index} 必須是一個包含兩個元素的陣列`,
        ConfigError.CODES.INVALID_FORMAT,
        "config_map.json"
      );
    }

    const [topic, deviceConfig] = entry;

    if (typeof topic !== "string" || topic.trim() === "") {
      throw new ConfigError(
        `設備映射條目 ${index} 的主題必須是一個非空字串`,
        ConfigError.CODES.VALIDATION_ERROR,
        "config_map.json"
      );
    }

    if (typeof deviceConfig !== "object" || deviceConfig === null) {
      throw new ConfigError(
        `設備映射條目 ${index} 的設備配置必須是一個物件`,
        ConfigError.CODES.INVALID_FORMAT,
        "config_map.json"
      );
    }

    if (
      typeof deviceConfig.type !== "string" ||
      deviceConfig.type.trim() === ""
    ) {
      throw new ConfigError(
        `設備映射條目 ${index} 的設備類型必須是一個非空字串`,
        ConfigError.CODES.VALIDATION_ERROR,
        "config_map.json"
      );
    }

    if (
      typeof deviceConfig.channels !== "object" ||
      deviceConfig.channels === null
    ) {
      throw new ConfigError(
        `設備映射條目 ${index} 的通道配置必須是一個物件`,
        ConfigError.CODES.INVALID_FORMAT,
        "config_map.json"
      );
    }

    for (const [channelName, addr] of Object.entries(deviceConfig.channels)) {
      if (typeof channelName !== "string" || channelName.trim() === "") {
        throw new ConfigError(
          `設備映射條目 ${index} 的通道名稱必須是一個非空字串`,
          ConfigError.CODES.VALIDATION_ERROR,
          "config_map.json"
        );
      }
      if (typeof addr !== "number" || !Number.isInteger(addr) || addr <= 0) {
        throw new ConfigError(
          `設備映射條目 ${index} 的通道地址 '${channelName}' 必須是一個正整數`,
          ConfigError.CODES.VALIDATION_ERROR,
          "config_map.json"
        );
      }
    }
  }
}

module.exports = {
  validateDeviceMap,
};
