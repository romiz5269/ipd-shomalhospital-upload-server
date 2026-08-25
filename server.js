const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");
const logger = require("./config/logger");
const compression = require("compression");
const multer = require("multer");
const dotenv = require("dotenv");
const {limiter} = require("./config/init");
const {performance} = require("perf_hooks");
performance.eventLoopUtilization();
dotenv.config();
const app = express();

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, {recursive: true});

const EXPORTS_DIR = path.join(__dirname, "exports");
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, {recursive: true});

const upload_files = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});
const upload_exports = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, EXPORTS_DIR),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});
const serviceStartTime = Date.now();

app.use(compression());
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
  next();
});
app.post("/upload", upload_files.single("file"), (req, res) => {
  // Authorization
  const auth = req.headers["authorization"]?.split(" ")[1];
  if (auth !== process.env.CDN_SERVICE_TOKEN) {
    return res.status(401).json({error: "Unauthorized"});
  }

  if (!req.file) return res.status(400).json({error: "No file uploaded"});

  const publicUrl = `${process.env.CDN_PUBLIC_BASE}/uploads/${req.file.filename}`;

  return res.json({
    url: publicUrl,
    size: req.file.size,
    mime: req.file.mimetype,
  });
});
app.post("/upload-exports", upload_exports.single("exports"), (req, res) => {
  // Authorization
  // console.log(req);
  const auth = req.headers["authorization"]?.split(" ")[1];
  if (auth !== process.env.CDN_SERVICE_TOKEN) {
    return res.status(401).json({error: "Unauthorized"});
  }

  if (!req.file) return res.status(400).json({error: "No file uploaded"});

  const publicUrl = `${process.env.CDN_PUBLIC_BASE}/exports/${req.file.filename}`;

  return res.json({
    url: publicUrl,
    size: req.file.size,
    mime: req.file.mimetype,
  });
});

app.post("/upload/delete", (req, res) => {
  const auth = req.headers["authorization"];
  const bearer = auth?.split(" ")[1];
  if (bearer !== process.env.CDN_SERVICE_TOKEN) {
    return res.status(401).json({error: "Unauthorized"});
  }
  console.log(req)
  const {fileKey, fileUrl} = req.body;
  const fileName = fileKey ?? fileUrl?.split("/").pop();
  if (!fileName) return res.status(400).json({error: "file key/url missing"});
  const savePath = path.join(UPLOAD_DIR, fileName);
  if (!fs.existsSync(savePath))
    return res.status(404).json({error: "Not found"});
  fs.unlinkSync(savePath);
  return res.json({success: true, file: fileName});
});

app.use("/uploads", express.static(UPLOAD_DIR, {maxAge: 3600}));
app.use("/exports", express.static(EXPORTS_DIR, {maxAge: 3600}));

app.get("/status", (req, res) => {
  try {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const elu = performance.eventLoopUtilization();
    res.status(200).json({
      status: "OK",
      system: {
        service: {
          uptime: Math.floor(process.uptime()),
          pid: process.pid,
          nodeVersion: process.version,
        },
        memory: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        eventLoop: {
          utilization: +elu.utilization.toFixed(4),
          active: elu.active,
          idle: elu.idle,
        },
        system: {
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
          loadAvg: os.loadavg(),
          cpuCores: os.cpus().length,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "خطای داخلی سرویس",
      error: error.message,
    });
  }
});
app.get("/logs", (req, res) => {
  const logFilePath = path.join(__dirname, "logs", "cdn.log");

  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({
        status: "ERROR",
        message: "لاگ خوانده نشد",
        error: err.message,
      });
    }

    return res.status(200).json({
      status: "OK",
      logs: data.split("\n").filter((line) => line),
    });
  });
});
app.delete("/logs/clear", (req, res) => {
  const logFilePath = path.join(__dirname, "logs", "cdn.log");

  fs.truncate(logFilePath, 0, (err) => {
    if (err) {
      return res
        .status(500)
        .json({status: "ERROR", message: "خطا در پاکسازی لاگ ها"});
    }
    return res
      .status(200)
      .json({status: "OK", message: "لاگ ها با موفقیت پاک شدند"});
  });
});
app.listen(4000, () => console.log("CDN server listening on 4000"));
