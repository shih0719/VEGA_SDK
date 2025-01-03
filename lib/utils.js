const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logFilePath) {
        this.logFilePath = logFilePath || path.join(__dirname, 'app.log');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        fs.appendFile(this.logFilePath, logMessage, (err) => {
            if (err) {
                console.error('Failed to write log:', err);
            }
        });
    }

    info(message) {
        this.log(`INFO: ${message}`);
    }

    error(message) {
        this.log(`ERROR: ${message}`);
    }

    debug(message) {
        this.log(`DEBUG: ${message}`);
    }
}



module.exports = Logger;

