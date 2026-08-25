const path = require("path");
const fs = require("fs");
const winston = require("winston");
const logDirectory = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}
const logger = winston.createLogger({
  level: "info",
  format: winston.format?.json(),
  transports: [
    new winston.transports.File({filename: path.join(logDirectory, "cdn.log")}),
  ],
});

module.exports = logger;
