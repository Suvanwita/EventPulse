const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const env = require("./config/env");

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "EventPulse backend running",
  });
});

module.exports = app;
