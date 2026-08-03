const { makeCsvLogger } = require("./csvLog");

const log = makeCsvLogger("write-audit.csv", "time,addr,topic,channel,value");

/**
 * 記錄一筆外部 Modbus 寫入，供事後查詢 (時間/點位/寫入值)
 * @param {number} addr - Modbus 寄存器地址
 * @param {string} topic - 對應的 MQTT topic
 * @param {string} channel - 對應的 channel 名稱
 * @param {number} value - 寫入值
 */
function recordWrite(addr, topic, channel, value) {
  log.append(`${addr},${topic},${channel},${value}`);
}

module.exports = { recordWrite, rotate: log.rotate, csvPath: log.csvPath };
