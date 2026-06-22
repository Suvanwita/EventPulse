require("../observability/tracing");

const prisma = require("../config/prisma");
const { logger } = require("../observability/logger");
const { shutdownTracing } = require("../observability/tracing");
const { cleanupExpiredIdempotencyKeys } = require("../middleware/idempotency.middleware");

async function runIdempotencyCleanup() {
  const result = await cleanupExpiredIdempotencyKeys();

  logger.info({
    deleted: result.count,
  }, "Expired idempotency keys cleaned up");

  return result;
}

if (require.main === module) {
  runIdempotencyCleanup()
    .then(async () => {
      await prisma.$disconnect();
      await shutdownTracing();
    })
    .catch(async (error) => {
      logger.error({ error }, "Idempotency cleanup failed");
      await prisma.$disconnect();
      await shutdownTracing().catch(() => {});
      process.exit(1);
    });
}

module.exports = {
  runIdempotencyCleanup,
};
