require("dotenv").config();

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://eventpulse:eventpulse@localhost:5433/eventpulse?schema=public",
  },
  migrations: {
    seed: "node prisma/seed.js",
  },
});
