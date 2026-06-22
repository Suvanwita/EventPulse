require("../observability/tracing");

const { Worker } = require("bullmq");

const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { disconnectProducer } = require("../config/kafka");
const { logger } = require("../observability/logger");
const { recordBullMQJob } = require("../observability/metrics");
const { shutdownTracing } = require("../observability/tracing");
const { withSpan } = require("../observability/spans");
const { getBullConnection } = require("./connection");
const { QUEUE_NAMES, closeQueues } = require("./queues");
const { handleJob } = require("./jobHandlers");

const WORKER_CONCURRENCY = Number(process.env.BULLMQ_WORKER_CONCURRENCY) || 5;

function createWorker(queueName) {
  const worker = new Worker(queueName, (job) =>
    withSpan("bullmq.job", {
      "messaging.system": "bullmq",
      "messaging.destination.name": queueName,
      "messaging.operation": "process",
      "messaging.message.id": job.id || "",
      "eventpulse.bullmq.job_name": job.name,
      "eventpulse.bullmq.attempt": job.attemptsMade + 1,
    }, () => handleJob(job)),
  {
    connection: getBullConnection({
      worker: true,
    }),
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on("active", (job) => {
    logger.info({
      queue: queueName,
      jobId: job.id,
      name: job.name,
      attempt: job.attemptsMade + 1,
    }, "BullMQ job started");
  });

  worker.on("completed", (job, result) => {
    recordBullMQJob(queueName, job.name, "completed");
    logger.info({
      queue: queueName,
      jobId: job.id,
      name: job.name,
      result,
    }, "BullMQ job completed");
  });

  worker.on("failed", (job, error) => {
    recordBullMQJob(queueName, job?.name || "unknown", "failed");
    logger.error({
      queue: queueName,
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    }, "BullMQ job failed");
  });

  worker.on("error", (error) => {
    logger.error({
      queue: queueName,
      error,
    }, "BullMQ worker error");
  });

  return worker;
}

function startWorkers() {
  const workers = Object.values(QUEUE_NAMES).map(createWorker);

  logger.info({
    queues: Object.values(QUEUE_NAMES),
  }, "BullMQ workers started");

  return workers;
}

async function shutdown(workers, signal) {
  logger.info({
    signal,
  }, "BullMQ worker shutdown requested");

  await Promise.allSettled(workers.map((worker) => worker.close()));
  await closeQueues();
  await disconnectProducer();
  try {
    await redis.quit();
  } catch {
    // Redis may not have connected for every worker run.
  }
  await prisma.$disconnect();
  await shutdownTracing().catch((error) => logger.error({ error }, "OpenTelemetry shutdown failed"));
}

if (require.main === module) {
  const workers = startWorkers();

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      await shutdown(workers, signal);
      process.exit(0);
    });
  }
}

module.exports = {
  startWorkers,
};
