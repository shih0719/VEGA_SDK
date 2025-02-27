Run with Command line
1. npx app start -c <path> 'Path to config file'

Auto start with pm2
1. install pm2
2. cd <path to VEGA_SDK>
3. 開啟生產模式 pm2 start ecosystem.config.js -c config.js --env production
4. 
