module.exports = {
  apps : [{
    name   : "VEGA-SDK",
    script : "./bin/cli.js",
    args : "start -c ./config.js",
    watch: true,
    env: {
      NODE_ENV: "development"  // 开发模式
    },
    env_production: {
      NODE_ENV: "production"   // 生产模式
    },
    cron_restart: "0 3 * * 0", // 每周日凌晨 03:00 自動重啟
    log_date_format: "YYYY-MM-DD HH:mm Z" // 日志时间格式
  }]
}
