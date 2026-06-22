CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "key" TEXT,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");
CREATE INDEX "OutboxEvent_topic_idx" ON "OutboxEvent"("topic");
CREATE INDEX "OutboxEvent_publishedAt_idx" ON "OutboxEvent"("publishedAt");
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");
