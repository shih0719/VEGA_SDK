module.exports = {
  apps: [
    {
      name: "vega-sdk",
      script: "index.js",
      // ponytail: process-level safety net for RTU/serial mode — restarts
      // on crash. Port-not-found retries already happen inside
      // ModbusService (MODBUS_RTU_RETRY_PERIOD), this covers everything else.
      autorestart: true,
      restart_delay: 5000,
      max_restarts: Infinity, // no limit, even if it flaps
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
