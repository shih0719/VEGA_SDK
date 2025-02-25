#!/usr/bin/env node

const mqtt2modbus = require('../lib/core');
const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const program = new Command();
let Service;

program
    .version('1.0.0')
    .description('Cli for VEGA MQTT2Modbus service')
    .option('-c --config <path>', 'Path to config file','../lib/config')
program
    .command('start')
    .description('default subscribe test/GW/+')
    .action(() => {
      const configPath = path.resolve(program.opts().config);
      console.log(`Config path: ${configPath}`); // 打印 configPath 的值
        let config;
        if (fs.existsSync(configPath)) {
            config = require(configPath);
        } else {
            config = require('../lib/config');
            console.error('Config file not found, using default config');
        }
        Service = new mqtt2modbus(config);
        Service.startMQTT();
        Service.startModbus();
        Service.on('mqttConnected', () => {
            Service.subscribe('1PNLY77GX/00002AEK/#');
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