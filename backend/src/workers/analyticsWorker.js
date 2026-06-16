const prisma = require("../config/prisma");
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

  console.log(`Analytics worker processing ${events.length} event(s).`);

  for (const event of events) {
    const analytics = await analyticsService.getEventAnalytics(event.id);
    console.log("Event analytics", {
      eventId: event.id,
      title: event.title,
      ...analytics,
    });
  }

  const venueAnalytics = await analyticsService.getVenueAnalytics();
  console.log("Venue analytics", venueAnalytics);

  const checkinAnalytics = await analyticsService.getCheckinAnalytics();
  console.log("Check-in analytics", checkinAnalytics);
}

if (require.main === module) {
  runAnalyticsWorker()
    .catch((error) => {
      console.error("Analytics worker failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  runAnalyticsWorker,
};
