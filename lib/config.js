const config = {
    mqtt: {
        url: 'mqtt://192.168.23.58',
        options: {
            clientId: 'mqttjs01',
            username: 'user',
            password: 'password',
            reconnectPeriod: 1000, // 重新连接的时间间隔，单位为毫秒
            connectTimeout: 30 * 1000, // 连接超时时间，单位为毫秒
            keepalive: 60, // 心跳间隔时间，单位为秒
        }
    },
    modbus: {
        host: '127.0.0.1',
        port: 502,
    },
    map: new Map([
        ['test/GW/DK1', { type: 'switch', channels: { switch_ch1: 1, switch_ch2: 2, switch_ch3: 3, switch_ch4: 4 } }],
        ['test/GW/DK2', { type: 'switch', channels: { switch_ch1: 5, switch_ch2: 6, switch_ch3: 7, switch_ch4: 8 } }],
        ['test/GW/DK3', { type: 'switch', channels: { switch_ch1: 9, switch_ch2: 10, switch_ch3: 11, switch_ch4: 12 } }],
        ['test/GW/DK4', { type: 'panel', channels: { switch_ch1: 13, button_id: 14 } }],
        ['eastsoft/0000IPX8/00008IBU', { type: 'aircondition', channels: { power_on: 15, rev_speed: 16 ,temperature: 17,model: 18,
            current_temp: 19, humidness: 20 } }]
    ]),
    
};
//由modbus addr查詢對應的topic和channel
config.reverseMap = new Map();
for (let [topic, { type, channels }] of config.map) {
    topic = topic+'/command';
    for (const [channel, addr] of Object.entries(channels)) {
        config.reverseMap.set(addr, { topic, channel, type });
    }
}
// 打印reverseMap列表
// console.log('reverseMap:');
// for(const [key, value] of config.reverseMap){
//     console.log(`Key: ${key}, Value: ${JSON.stringify(value)}`);
// }
module.exports = config;