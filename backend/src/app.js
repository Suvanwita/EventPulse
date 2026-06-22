const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const notFoundMiddleware = require("./middleware/notFound.middleware");
const { createHttpLogger } = require("./observability/logger");

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(createHttpLogger());

app.use(routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
