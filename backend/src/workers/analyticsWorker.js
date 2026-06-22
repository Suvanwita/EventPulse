require("../observability/tracing");

const prisma = require("../config/prisma");
const { logger } = require("../observability/logger");
const analyticsService = require("../modules/analytics/analytics.service");

async function runAnalyticsWorker() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      startTime: "desc",
    },
  });

  logger.info({ eventCount: events.length }, "Analytics worker processing events");

  for (const event of events) {
    const analytics = await analyticsService.getEventAnalytics(event.id);
    logger.info({
      eventId: event.id,
      title: event.title,
      ...analytics,
    }, "Event analytics computed");
  }

  const venueAnalytics = await analyticsService.getVenueAnalytics();
  logger.info({ venueAnalytics }, "Venue analytics computed");

  const checkinAnalytics = await analyticsService.getCheckinAnalytics();
  logger.info({ checkinAnalytics }, "Check-in analytics computed");
}

if (require.main === module) {
  runAnalyticsWorker()
    .catch((error) => {
      logger.error({ error }, "Analytics worker failed");
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  runAnalyticsWorker,
};
