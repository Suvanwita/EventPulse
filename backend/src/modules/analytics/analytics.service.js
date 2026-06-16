const prisma = require("../../config/prisma");
const { hasOverlap } = require("../../dsa/intervalScheduler");
const ApiError = require("../../utils/ApiError");

function getHourKey(date) {
  return new Date(date).toISOString().slice(0, 13) + ":00:00.000Z";
}

function groupBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function getPeakCheckinHour(checkIns) {
  const checkinsByHour = groupBy(checkIns, (checkIn) =>
    getHourKey(checkIn.scannedAt)
  );
  const [hour, count] =
    Object.entries(checkinsByHour).sort((a, b) => b[1] - a[1])[0] || [];

  return hour
    ? {
        hour,
        count,
      }
    : null;
}

function getEntryRatePerMinute(checkIns) {
  if (checkIns.length === 0) {
    return 0;
  }

  const timestamps = checkIns
    .map((checkIn) => new Date(checkIn.scannedAt).getTime())
    .sort((a, b) => a - b);
  const spanMinutes = Math.max(
    (timestamps[timestamps.length - 1] - timestamps[0]) / 60000,
    1
  );

  return Number((checkIns.length / spanMinutes).toFixed(2));
}

async function assertEventAnalyticsAccess(eventId, user) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (user.role !== "ADMIN" && event.createdById !== user.id) {
    throw new ApiError(403, "Forbidden");
  }
}

async function getEventAnalytics(eventId) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      capacity: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const [
    registeredCount,
    waitlistCount,
    checkedInCount,
    noShowCount,
    promotedWaitlistCount,
    totalWaitlistCount,
    checkIns,
  ] = await Promise.all([
    prisma.registration.count({
      where: {
        eventId,
        status: {
          in: ["CONFIRMED", "CHECKED_IN"],
        },
      },
    }),
    prisma.waitlistEntry.count({
      where: {
        eventId,
        status: "WAITING",
      },
    }),
    prisma.checkIn.count({
      where: {
        eventId,
      },
    }),
    prisma.registration.count({
      where: {
        eventId,
        status: "NO_SHOW",
      },
    }),
    prisma.waitlistEntry.count({
      where: {
        eventId,
        status: "PROMOTED",
      },
    }),
    prisma.waitlistEntry.count({
      where: {
        eventId,
      },
    }),
    prisma.checkIn.findMany({
      where: {
        eventId,
      },
      select: {
        scannedAt: true,
      },
    }),
  ]);

  const attendanceDenominator =
    registeredCount + noShowCount > 0 ? registeredCount + noShowCount : 0;
  const attendancePercentage = attendanceDenominator
    ? Number(((checkedInCount / attendanceDenominator) * 100).toFixed(2))
    : 0;
  const waitlistConversionRate = totalWaitlistCount
    ? Number(((promotedWaitlistCount / totalWaitlistCount) * 100).toFixed(2))
    : 0;

  return {
    registeredCount,
    waitlistCount,
    checkedInCount,
    noShowCount,
    attendancePercentage,
    waitlistConversionRate,
    peakCheckinHour: getPeakCheckinHour(checkIns),
    entryRatePerMinute: getEntryRatePerMinute(checkIns),
  };
}

function countVenueConflicts(events) {
  let conflictCount = 0;
  const intervals = events.map((event) => ({
    id: event.id,
    start: event.startTime,
    end: event.endTime,
  }));

  for (let index = 0; index < intervals.length; index += 1) {
    const current = intervals[index];
    const remaining = intervals.slice(index + 1);

    if (hasOverlap(current.start, current.end, remaining)) {
      conflictCount += 1;
    }
  }

  return conflictCount;
}

async function getVenueAnalytics() {
  const venues = await prisma.venue.findMany({
    include: {
      events: {
        include: {
          registrations: {
            where: {
              status: {
                in: ["CONFIRMED", "CHECKED_IN"],
              },
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return venues.map((venue) => {
    const utilizationValues = venue.events.map((event) =>
      event.capacity ? event.registrations.length / event.capacity : 0
    );
    const averageUtilization = utilizationValues.length
      ? Number(
          (
            (utilizationValues.reduce((sum, value) => sum + value, 0) /
              utilizationValues.length) *
            100
          ).toFixed(2)
        )
      : 0;

    return {
      venueId: venue.id,
      venueName: venue.name,
      capacity: venue.capacity,
      eventsHosted: venue.events.length,
      averageUtilization,
      conflictCount: countVenueConflicts(venue.events),
    };
  });
}

async function getCheckinAnalytics() {
  const [checkIns, failedScanCount] = await Promise.all([
    prisma.checkIn.findMany({
      select: {
        scannedAt: true,
        gateName: true,
      },
    }),
    prisma.eventLog.count({
      where: {
        type: "CHECKIN_REJECTED",
      },
    }),
  ]);

  return {
    totalCheckins: checkIns.length,
    checkinsByHour: groupBy(checkIns, (checkIn) => getHourKey(checkIn.scannedAt)),
    checkinsByGate: groupBy(checkIns, (checkIn) => checkIn.gateName),
    failedScanCount,
  };
}

module.exports = {
  assertEventAnalyticsAccess,
  getEventAnalytics,
  getVenueAnalytics,
  getCheckinAnalytics,
};
