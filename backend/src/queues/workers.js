const { Worker } = require("bullmq");

const prisma = require("../config/prisma");
const redis = require("../config/redis");
const { disconnectProducer } = require("../config/kafka");
const { getBullConnection } = require("./connection");
const { QUEUE_NAMES, closeQueues } = require("./queues");
const { handleJob } = require("./jobHandlers");

const WORKER_CONCURRENCY = Number(process.env.BULLMQ_WORKER_CONCURRENCY) || 5;

function createWorker(queueName) {
  const worker = new Worker(queueName, handleJob, {
    connection: getBullConnection({
      worker: true,
    }),
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on("active", (job) => {
    console.log("BullMQ job started", {
      queue: queueName,
      jobId: job.id,
      name: job.name,
      attempt: job.attemptsMade + 1,
    });
  });

  worker.on("completed", (job, result) => {
    console.log("BullMQ job completed", {
      queue: queueName,
      jobId: job.id,
      name: job.name,
      result,
    });
  });

  worker.on("failed", (job, error) => {
    console.error("BullMQ job failed", {
      queue: queueName,
      jobId: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  });

  worker.on("error", (error) => {
    console.error("BullMQ worker error", {
      queue: queueName,
      error,
    });
  });

  return worker;
}

function startWorkers() {
  const workers = Object.values(QUEUE_NAMES).map(createWorker);

  console.log("BullMQ workers started", {
    queues: Object.values(QUEUE_NAMES),
  });

  return workers;
}

async function shutdown(workers, signal) {
  console.log("BullMQ worker shutdown requested", {
    signal,
  });

  await Promise.allSettled(workers.map((worker) => worker.close()));
  await closeQueues();
  await disconnectProducer();
  try {
    await redis.quit();
  } catch {
    // Redis may not have connected for every worker run.
  }
  await prisma.$disconnect();
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
