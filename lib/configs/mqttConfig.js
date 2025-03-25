const mqtt = {
  url: "mqtt://192.168.23.58",
  options: {
    clientId: "mqttjs01",
    username: "user",
    password: "password",
    reconnectPeriod: 30 * 1000, // 重新连接的时间间隔，单位为毫秒
    connectTimeout: 60 * 1000, // 连接超时时间，单位为毫秒
    keepalive: 60, // 心跳间隔时间，单位为秒
  },
};
module.exports = mqtt;
