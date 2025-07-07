const ModbusRTU = require("modbus-serial");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("../logger");
const { ServiceError, createError } = require("../errors");

class ModbusService extends EventEmitter {
  constructor(config, holdingRegisters) {
    super();
    this.modbusConfig = config;
    this.modbusServer = null;
    this.isModbusRunning = false;
    this.holdingRegisters = holdingRegisters; // 引用外部的 holdingRegisters

    this.modbusServer = new ModbusRTU.ServerTCP(
      {
        getHoldingRegister: this._getHoldingRegister.bind(this),
        setRegister: (addr, value) =>
          this._handleExternalWriteRequest(addr, value),
      },
      { host: this.modbusConfig.host, port: this.modbusConfig.port }
    );

    this.modbusServer.on("error", (err) => {
      logger.error("Modbus server error:", err);
      this.emit(
        "error",
        createError("service", `Modbus server error: ${err.message}`, 5001, {
          service: "Modbus",
          originalError: err,
        })
      );
    });

    this.modbusServer.on("initialized", () => {
      logger.info("Modbus server initialized.");
    });

    this.modbusServer.on("socketError", (err) => {
      logger.error("Modbus socket error:", err);
      this.emit(
        "error",
        createError("service", `Modbus socket error: ${err.message}`, 5002, {
          service: "Modbus",
          originalError: err,
        })
      );
    });
  }

  start() {
    if (this.isModbusRunning) {
      throw new Error("Modbus server is already running.");
    }
    // ModbusRTU.ServerTCP 的构造函数已经启动了服务器，这里只需要更新状态
    this.isModbusRunning = true;
    logger.info(
      `Modbus server started on ${this.modbusConfig.host}:${this.modbusConfig.port}`
    );
    this.emit("started");
  }

  stop() {
    if (!this.isModbusRunning) {
      throw new Error("Modbus server is not running.");
    }
    this.modbusServer.close(() => {
      this.isModbusRunning = false;
      logger.info("Modbus server stopped");
      this.emit("stopped");
    });
  }

  isRunning() {
    return this.isModbusRunning;
  }

  _getHoldingRegister(addr) {
    logger.debug(
      `Modbus read holding register at address ${addr}: ${
        this.holdingRegisters[addr] || 0
      }`
    );
    return this.holdingRegisters[addr] || 0;
  }

  _handleExternalWriteRequest(addr, value) {
    logger.debug(
      `Modbus external write request for address ${addr} with value ${value}`
    );
    this.emit("externalWriteRequest", addr, value); // 發射外部寫入請求事件
  }

  setInternalHoldingRegister(addr, value) {
    logger.debug(
      `Modbus internal set holding register at address ${addr} with value ${value}`
    );
    this.holdingRegisters[addr] = value;
  }
}

module.exports = ModbusService;
