const {default: rateLimit} = require("express-rate-limit");
const path = require("path");
require("dotenv").config();
module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET:
    process.env.JWT_SECRET || "dasdG23qewqe1234441fFGfdhdghnnbCCZXQSDQWEweqwe",
  STORAGE_PATH: path.resolve(__dirname, "../uploads"),
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "image/webp"], // نوع‌های مجاز
  limiter: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 دقیقه
    max: 30,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(500).json({
        status: 500,
        message: "تعداد درخواست ها بیش تر از حد مجاز، در فرصتی دیگر تلاش کنید",
      });
    },
  }),
};
