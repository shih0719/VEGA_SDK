module.exports = {
  apps: [
    {
      name: "VEGA-SDK",
      script: "index.js",
      instances: 1, // 單實例運行
      watch: false,
      max_memory_restart: "1G",
      env_file: ".env", // 指定 .env 文件
      env: {
        NODE_ENV: "development", // 開發模式
      },
      env_production: {
        NODE_ENV: "production", // 生產模式
      },
      cron_restart: "0 3 * * 0", // 每周日凌晨 03:00 自動重啟
      log_date_format: "YYYY-MM-DD HH:mm Z", // 日志时间格式
    },
  ],
};
