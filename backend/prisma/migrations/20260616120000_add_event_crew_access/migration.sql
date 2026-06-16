-- CreateEnum
CREATE TYPE "CrewAccessType" AS ENUM ('EVENT_ORGANIZER', 'CREW', 'PERFORMER', 'SPEAKER', 'VOLUNTEER_HELPER', 'VIP_ENTRY');

-- AlterEnum
ALTER TYPE "EventLogType" ADD VALUE IF NOT EXISTS 'CREW_ACCESS_GRANTED';
ALTER TYPE "EventLogType" ADD VALUE IF NOT EXISTS 'CREW_ACCESS_UPDATED';
ALTER TYPE "EventLogType" ADD VALUE IF NOT EXISTS 'CREW_ACCESS_REVOKED';
ALTER TYPE "EventLogType" ADD VALUE IF NOT EXISTS 'CREW_SPECIAL_ENTRY_USED';

-- AlterTable
ALTER TABLE "CheckIn" ALTER COLUMN "registrationId" DROP NOT NULL;
ALTER TABLE "CheckIn" ADD COLUMN "specialEntryUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CheckIn" ADD COLUMN "crewAccessId" TEXT;
ALTER TABLE "CheckIn" ADD COLUMN "accessType" "CrewAccessType";

-- CreateTable
CREATE TABLE "EventCrewAccess" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "gateName" TEXT NOT NULL,
    "note" TEXT,
    "accessType" "CrewAccessType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCrewAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCrewAccess_eventId_userId_key" ON "EventCrewAccess"("eventId", "userId");
CREATE INDEX "EventCrewAccess_eventId_idx" ON "EventCrewAccess"("eventId");
CREATE INDEX "EventCrewAccess_userId_idx" ON "EventCrewAccess"("userId");
CREATE INDEX "EventCrewAccess_gateName_idx" ON "EventCrewAccess"("gateName");
CREATE INDEX "EventCrewAccess_accessType_idx" ON "EventCrewAccess"("accessType");
CREATE INDEX "EventCrewAccess_isActive_idx" ON "EventCrewAccess"("isActive");
CREATE INDEX "CheckIn_crewAccessId_idx" ON "CheckIn"("crewAccessId");
CREATE INDEX "CheckIn_accessType_idx" ON "CheckIn"("accessType");

-- AddForeignKey
ALTER TABLE "EventCrewAccess" ADD CONSTRAINT "EventCrewAccess_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventCrewAccess" ADD CONSTRAINT "EventCrewAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventCrewAccess" ADD CONSTRAINT "EventCrewAccess_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_crewAccessId_fkey" FOREIGN KEY ("crewAccessId") REFERENCES "EventCrewAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
