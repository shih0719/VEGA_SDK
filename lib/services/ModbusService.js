const ModbusRTU = require("modbus-serial");
const EventEmitter = require("events");
const { defaultLogger: logger } = require("../logger");
const { createError } = require("../errors");

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

    // ponytail: fixed retry interval, no attempt cap — serial port is
    // expected to eventually appear (USB adapter plugged in, etc.)
    this.rtuRetryPeriod = Number(process.env.MODBUS_RTU_RETRY_PERIOD) || 5000;
    this.rtuRetryTimer = null;
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
        // ponytail: FC1/FC5/FC15 coils reuse the same holdingRegisters store
        // as booleans (0/1), same address space as the holding registers.
        getCoil: (addr) => this._getCoil(addr),
        setCoil: (addr, value) =>
          this._handleExternalWriteRequest(addr, value ? 1 : 0),
      };

      const mode = this.modbusConfig.mode || "tcp";

      if (mode === "rtu") {
        const serial = this.modbusConfig.serial;
        if (!serial || !serial.path) {
          return reject(
            new Error(
              "Modbus RTU mode requires MODBUS_SERIAL_PATH in .env"
            )
          );
        }
        return this._startRtuWithRetry(handlers, serial, resolve);
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

      this._attachServerListeners(mode, resolve, reject);
    });
  }

  // ponytail: RTU serial port may not exist yet (USB adapter unplugged,
  // udev not settled, etc.) — retry forever on a fixed interval instead of
  // rejecting start(). TCP mode doesn't need this: binding a TCP port fails
  // fast and predictably, no external hardware to wait for.
  _startRtuWithRetry(handlers, serial, resolve) {
    const attempt = () => {
      this.modbusServer = new ModbusRTU.ServerSerial(handlers, {
        path: serial.path,
        baudRate: serial.baudRate,
        dataBits: serial.dataBits,
        stopBits: serial.stopBits,
        parity: serial.parity,
        // forwarded straight to the underlying SerialPort constructor —
        // without it, an open failure is an unhandled "error" event that
        // crashes the process instead of giving us a chance to retry
        openCallback: (err) => {
          if (!err) return;
          logger.warn(
            `Modbus RTU: failed to open ${serial.path} (${err.message}), retrying in ${this.rtuRetryPeriod}ms`
          );
          this.rtuRetryTimer = setTimeout(attempt, this.rtuRetryPeriod);
        },
      });
      logger.info(
        `Modbus RTU server starting on ${serial.path} @ ${serial.baudRate} baud`
      );
      this._attachServerListeners("rtu", resolve, () => {});
    };
    attempt();
  }

  _attachServerListeners(mode, resolve, reject) {
    this.modbusServer.on("error", (err) => {
      logger.error("Modbus server error event:", err);
      const wrappedError = createError(
        "service",
        `Modbus server error: ${err.message}`,
        5004,
        { service: "Modbus", originalError: err }
      );
      this.emit("error", wrappedError);
      if (!this.isModbusRunning) reject(wrappedError);
    });

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

  _getCoil(addr) {
    const value = Boolean(this.holdingRegisters[addr]);
    logger.debug(`Modbus read coil at address ${addr}: ${value}`);
    return value;
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
