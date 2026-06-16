require("dotenv").config();

const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://eventpulse:eventpulse@localhost:5433/eventpulse?schema=public",
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT) || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  KAFKA_BROKER: process.env.KAFKA_BROKER || "localhost:9094",
};

module.exports = env;
