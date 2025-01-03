module.exports = {
    mqtt: {
        url: 'mqtt://broker.hivemq.com',
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
    ])
};