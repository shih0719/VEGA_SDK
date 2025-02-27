module.exports = {
  apps : [{
    name   : "VEGA-SDK",
    script : "./bin/cli.js",
    args : "start -c ./config.js",
    watch: true,
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
}
