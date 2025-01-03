const config = {
    mqtt: {
        url: 'mqtt://192.168.23.58',
        options: {
            clientId: 'mqttjs01',
            username: 'user',
            password: 'password'
        }
    },
    modbus: {
        host: '127.0.0.1',
        port: 502,
    },
    map: new Map([
        ['test/GW/DK1', { type: 'switch', channels: { ch1: 1, ch2: 2, ch3: 3, ch4: 4 } }],
        ['test/GW/DK2', { type: 'switch', channels: { ch1: 5, ch2: 6, ch3: 7, ch4: 8 } }],
        ['test/GW/DK3', { type: 'switch', channels: { ch1: 9, ch2: 10, ch3: 11, ch4: 12 } }]
    ]),
    
};
//由modbus addr查詢對應的topic和channel
config.reverseMap = new Map();
for (const [topic, { type, channels }] of config.map) {
    for (const [channel, addr] of Object.entries(channels)) {
        config.reverseMap.set(addr, { topic, channel, type });
    }
}
module.exports = config;