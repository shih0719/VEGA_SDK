const ModbusRTU = require("modbus-serial");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("../logger");
const { ServiceError, createError } = require("../errors");

class ModbusService extends EventEmitter {
  constructor(config, holdingRegisters, saveHoldingRegisters) {
    super();
    this.modbusConfig = config;
    this.modbusServer = null;
    this.isModbusRunning = false;
    this.holdingRegisters = holdingRegisters;
    this.saveHoldingRegisters = saveHoldingRegisters;

    this.saveInterval = 60000;
    this.saveTimer = null;
    this.hasChanges = false;
  }

  start() {
    if (this.isModbusRunning) {
      throw new Error("Modbus server is already running.");
    }

    return new Promise((resolve, reject) => {
      const handlers = {
        getHoldingRegister: this._getHoldingRegister.bind(this),
        setRegister: (addr, value) =>
          this._handleExternalWriteRequest(addr, value),
      };

      const mode = this.modbusConfig.mode || "tcp";

      if (mode === "rtu") {
        const serial = this.modbusConfig.serial;
        if (!serial || !serial.path) {
          return reject(
            new Error(
              "Modbus RTU mode requires modbus.serial.path in settings.json"
            )
          );
        }
        this.modbusServer = new ModbusRTU.ServerSerial(handlers, {
          path: serial.path,
          baudRate: serial.baudRate,
          dataBits: serial.dataBits,
          stopBits: serial.stopBits,
          parity: serial.parity,
        });
        logger.info(
          `Modbus RTU server starting on ${serial.path} @ ${serial.baudRate} baud`
        );
      } else if (mode === "tcp") {
        this.modbusServer = new ModbusRTU.ServerTCP(handlers, {
          host: this.modbusConfig.host,
          port: this.modbusConfig.port,
        });
      } else {
        return reject(
          new Error(
            `Unknown modbus mode: "${mode}". Expected "tcp" or "rtu".`
          )
        );
      }

      this.modbusServer.once("initialized", () => {
        this.isModbusRunning = true;
        this._startSaveTimer();
        const connInfo =
          mode === "rtu"
            ? `${this.modbusConfig.serial.path} @ ${this.modbusConfig.serial.baudRate} baud`
            : `${this.modbusConfig.host}:${this.modbusConfig.port}`;
        logger.info(
          `Modbus ${mode.toUpperCase()} server started on ${connInfo} with save interval ${this.saveInterval}ms`
        );
        this.emit("started");
        resolve();
      });

      this.modbusServer.on("serverError", (err) => {
        logger.error("Modbus server error:", err);
        const error = createError(
          "service",
          `Modbus server error: ${err.message}`,
          5001,
          { service: "Modbus", originalError: err }
        );
        this.emit("error", error);
        if (!this.isModbusRunning) reject(error);
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
    });
  }

  stop() {
    if (!this.isModbusRunning) {
      throw new Error("Modbus server is not running.");
    }

    // 停止定時器並保存最後的變更
    this._stopSaveTimer();
    if (this.hasChanges && typeof this.saveHoldingRegisters === "function") {
      this.saveHoldingRegisters();
      logger.info("Final save of holding registers on service stop");
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
    this.hasChanges = true; // 標記有變更
  }

  _startSaveTimer() {
    this.saveTimer = setInterval(() => {
      if (this.hasChanges && typeof this.saveHoldingRegisters === "function") {
        this.saveHoldingRegisters();
        this.hasChanges = false;
        logger.debug("Periodic save of holding registers completed");
      }
    }, this.saveInterval);
    logger.info(
      `Started periodic save timer with interval ${this.saveInterval}ms`
    );
  }

  _stopSaveTimer() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      logger.debug("Stopped periodic save timer");
    }
  }

  // 添加手動保存方法
  forceSave() {
    if (typeof this.saveHoldingRegisters === "function") {
      this.saveHoldingRegisters();
      this.hasChanges = false;
      logger.info("Manual save of holding registers completed");
    }
  }
}

module.exports = ModbusService;
