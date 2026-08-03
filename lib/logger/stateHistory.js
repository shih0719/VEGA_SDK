const { makeCsvLogger } = require("./csvLog");

const log = makeCsvLogger("state-history.csv", "time,topic,type,channel,value");

/**
 * 記錄一筆設備狀態變更 (MQTT -> Modbus)，供事後查詢
 * @param {string} topic - MQTT 主題
 * @param {string} type - 設備類型
 * @param {string} channel - channel 名稱
 * @param {number} value - 寫入的暫存器值
 */
function recordState(topic, type, channel, value) {
  log.append(`${topic},${type},${channel},${value}`);
}

module.exports = { recordState, rotate: log.rotate, csvPath: log.csvPath };
