const config = {
    mqtt: {
        url: 'mqtt://iot.eastsoft.com.cn',
        options: {
            clientId: 'vega-mqtt2modbus',
            username: '0fbf92de-4ee3-4ac6-ade4-b6a92de4cc52',
            password: 'V50QDL3N'
        }
    },
    modbus: {
        host: '127.0.0.1',
        port: 502,
    },
    map: new Map([
        ['1PNLY77GX/00002AEK/0000LGFD', { type: 'switch', channels: { switch_ch1: 1, switch_ch2: 2, switch_ch3: 3, switch_ch4: 4 } }],
        ['1PNLY77GX/00002AEK/DK2', { type: 'switch', channels: { switch_ch1: 5, switch_ch2: 6, switch_ch3: 7, switch_ch4: 8 } }],
        ['1PNLY77GX/00002AEK/DK3', { type: 'switch', channels: { switch_ch1: 9, switch_ch2: 10, switch_ch3: 11, switch_ch4: 12 } }],
        ['1PNLY77GX/00002AEK/DK4', { type: 'panel', channels: { switch_ch1: 13, button_id: 14 } }],
        
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