const prisma = require("../../config/prisma");
const { ACTIONS, SUBJECTS, asSubject, authorize } = require("../../authorization/ability");
const FenwickTree = require("../../dsa/fenwickTree");
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

function normalizeBucketMinutes(bucketMinutes) {
  const value = Number(bucketMinutes || 10);

  if (!Number.isInteger(value) || value <= 0 || value > 1440) {
    throw new ApiError(400, "bucketMinutes must be a positive integer up to 1440");
  }

  return value;
}

function buildCheckinBuckets(checkIns, bucketMinutes = 10) {
  const normalizedBucketMinutes = normalizeBucketMinutes(bucketMinutes);
  const bucketMs = normalizedBucketMinutes * 60 * 1000;
  const timestamps = checkIns
    .map((checkIn) => new Date(checkIn.scannedAt).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return {
      bucketMinutes: normalizedBucketMinutes,
      bucketMs,
      baseTime: null,
      buckets: [],
      tree: new FenwickTree(0),
    };
  }

  const baseTime = Math.floor(timestamps[0] / bucketMs) * bucketMs;
  const lastTime = Math.floor(timestamps[timestamps.length - 1] / bucketMs) * bucketMs;
  const bucketCount = Math.floor((lastTime - baseTime) / bucketMs) + 1;
  const counts = Array(bucketCount).fill(0);

  timestamps.forEach((timestamp) => {
    const index = Math.floor((timestamp - baseTime) / bucketMs);
    counts[index] += 1;
  });

  const tree = new FenwickTree(0).buildFromArray(counts);
  const buckets = counts.map((count, index) => {
    const start = baseTime + index * bucketMs;
    return {
      index,
      startTime: new Date(start).toISOString(),
      endTime: new Date(start + bucketMs).toISOString(),
      count,
    };
  });

  return {
    bucketMinutes: normalizedBucketMinutes,
    bucketMs,
    baseTime,
    buckets,
    tree,
  };
}

function getBucketIndex(timestamp, baseTime, bucketMs) {
  return Math.floor((timestamp - baseTime) / bucketMs);
}

function getCheckinsInRangeFenwick(checkIns, startTime, endTime, bucketMinutes = 10) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new ApiError(400, "startTime and endTime must be valid ISO dates");
  }

  if (start > end) {
    throw new ApiError(400, "startTime must be before or equal to endTime");
  }

  const bucketData = buildCheckinBuckets(checkIns, bucketMinutes);

  if (bucketData.baseTime === null) {
    return {
      checkinCount: 0,
      buckets: [],
      peakWindow: null,
    };
  }

  const left = getBucketIndex(start, bucketData.baseTime, bucketData.bucketMs);
  const right = getBucketIndex(end, bucketData.baseTime, bucketData.bucketMs);
  const boundedLeft = Math.max(left, 0);
  const boundedRight = Math.min(right, bucketData.buckets.length - 1);
  const buckets =
    boundedLeft <= boundedRight
      ? bucketData.buckets.slice(boundedLeft, boundedRight + 1)
      : [];

  return {
    checkinCount: bucketData.tree.rangeQuery(left, right),
    buckets,
    peakWindow: getPeakCheckinWindowFenwick(checkIns, bucketMinutes),
  };
}

function getPeakCheckinWindowFenwick(checkIns, bucketMinutes = 10) {
  const bucketData = buildCheckinBuckets(checkIns, bucketMinutes);

  if (bucketData.buckets.length === 0) {
    return null;
  }

  let peakBucket = bucketData.buckets[0];
  bucketData.buckets.forEach((bucket) => {
    const count = bucketData.tree.rangeQuery(bucket.index, bucket.index);
    if (count > peakBucket.count) {
      peakBucket = {
        ...bucket,
        count,
      };
    }
  });

  return peakBucket;
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

  authorize(user, ACTIONS.READ, asSubject(SUBJECTS.ANALYTICS, event));
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

async function getEventTimeRangeAnalytics(eventId, query) {
  const bucketMinutes = normalizeBucketMinutes(query.bucketMinutes || 10);
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const startTime = query.startTime || event.startTime.toISOString();
  const endTime = query.endTime || event.endTime.toISOString();
  const checkIns = await prisma.checkIn.findMany({
    where: {
      eventId,
    },
    select: {
      scannedAt: true,
    },
    orderBy: {
      scannedAt: "asc",
    },
  });
  const rangeAnalytics = getCheckinsInRangeFenwick(
    checkIns,
    startTime,
    endTime,
    bucketMinutes
  );

  return {
    eventId,
    startTime,
    endTime,
    bucketMinutes,
    ...rangeAnalytics,
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
  buildCheckinBuckets,
  getCheckinsInRangeFenwick,
  getEventAnalytics,
  getEventTimeRangeAnalytics,
  getPeakCheckinWindowFenwick,
  getVenueAnalytics,
  getCheckinAnalytics,
};
