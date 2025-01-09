#!/usr/bin/env node

const mqtt2modbus = require('../lib/core');
const config = require('../lib/config');
const { Command } = require('commander');
const readline = require('readline');

const program = new Command();
const Service = new mqtt2modbus(config);

program
    .version('1.0.0')
    .description('Cli for VEGA MQTT2Modbus service');
program
    .command('start')
    .description('default subscribe test/GW/+')
    .action(() => {
        Service.startMQTT();
        Service.startModbus();
        Service.on('mqttConnected', () => {
            Service.subscribe('test/GW/+');
        });
    });
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on('line', (input) => {
        const [command, ...args] = input.split(' ');

      if (command === 'subscribe' && args.length > 0) {
        const topic = args[0];
        Service.subscribe(topic);
        console.log(`Subscribed to topic: ${topic}`);
      }else if (command === 'stop') {
        Service.stopMQTT();
        Service.stopModbus();
        console.log('Services stopped');
        rl.close();
      }
    });
    console.log('MQTT2Modbus CLI');

program.parse(process.argv);