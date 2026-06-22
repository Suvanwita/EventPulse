require("dotenv").config();

if (process.env.AUTHZ_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.AUTHZ_TEST_DATABASE_URL;
}

const configuredDatabaseUrl = process.env.DATABASE_URL || "";
const isClearlyLocalDatabase = /localhost|127\.0\.0\.1/.test(configuredDatabaseUrl);
const isClearlyTestDatabase = /eventpulse[-_]?test|test[-_]?eventpulse/i.test(configuredDatabaseUrl);
const allowRemoteDatabase = process.env.AUTHZ_ALLOW_REMOTE_DATABASE === "true";
const shouldRunAuthzTests =
  Boolean(configuredDatabaseUrl) &&
  (isClearlyLocalDatabase || isClearlyTestDatabase || allowRemoteDatabase);

process.env.JWT_SECRET = process.env.JWT_SECRET || "eventpulse-authz-test-secret";
process.env.OTEL_ENABLED = "false";
process.env.PROMETHEUS_BULLMQ_QUEUE_GAUGES = "false";

const jwt = require("jsonwebtoken");
const request = require("supertest");

const mockRateLimitResult = {
  limit: 1000,
  remaining: 999,
  resetAt: new Date(Date.now() + 60_000),
};
const mockNoopMiddleware = (req, res, next) => next();

jest.mock("../src/utils/rateLimiter", () => ({
  checkRateLimit: jest.fn(async () => mockRateLimitResult),
  createRateLimitMiddleware: jest.fn(() => mockNoopMiddleware),
  rateLimiters: {
    authLogin: mockNoopMiddleware,
    authRegister: mockNoopMiddleware,
    qrScan: mockNoopMiddleware,
    passGeneration: mockNoopMiddleware,
    notificationMutation: mockNoopMiddleware,
    adminWrite: mockNoopMiddleware,
  },
}));

jest.mock("../src/config/redis", () => ({
  incr: jest.fn(async () => 1),
  decr: jest.fn(async () => 1),
  expire: jest.fn(async () => 1),
  ttl: jest.fn(async () => 60),
  quit: jest.fn(async () => undefined),
}));

jest.mock("../src/queues/scheduler", () => ({
  scheduleEventLifecycleJobs: jest.fn(async () => undefined),
}));

jest.mock("../src/utils/eventProducer", () => {
  const publish = jest.fn(async () => ({
    enqueued: true,
    published: false,
  }));

  return {
    DLQ_TOPICS: {},
    RETRY_TOPICS: {},
    TOPICS: {},
    publishKafkaMessage: publish,
    publishEvent: publish,
    publishCrewAccessGranted: publish,
    publishCrewAccessRevoked: publish,
    publishCrewAccessUpdated: publish,
    publishCrewSpecialEntryUsed: publish,
    publishRegistrationCreated: publish,
    publishWaitlistJoined: publish,
    publishWaitlistPromoted: publish,
    publishRegistrationCancelled: publish,
    publishCheckinCompleted: publish,
    publishScanFailed: publish,
    publishNoShowReleased: publish,
  };
});

jest.mock("../src/utils/socketEmitter", () => ({
  emitCapacityUpdated: jest.fn(),
  emitCheckinUpdated: jest.fn(),
  emitCrewAccessUpdated: jest.fn(),
  emitEntryRateUpdated: jest.fn(),
  emitNotificationCreated: jest.fn(),
  emitNotificationRead: jest.fn(),
  emitNoShowReleased: jest.fn(),
  emitRegistrationUpdated: jest.fn(),
  emitSpecialEntryUsed: jest.fn(),
  emitWaitlistUpdated: jest.fn(),
}));

const app = shouldRunAuthzTests ? require("../src/app") : null;
const prisma = shouldRunAuthzTests ? require("../src/config/prisma") : null;

const RUN_ID = `authz-${Date.now()}`;
const passwordHash = "not-used-by-jwt-auth";

function tokenFor(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
}

function auth(user) {
  return {
    Authorization: `Bearer ${tokenFor(user)}`,
  };
}

function idempotencyKey(name) {
  return `${RUN_ID}-${name}`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: `.${RUN_ID}@example.test`,
      },
    },
    select: {
      id: true,
    },
  });
  const userIds = users.map((user) => user.id);
  const events = await prisma.event.findMany({
    where: {
      title: {
        contains: RUN_ID,
      },
    },
    select: {
      id: true,
      venueId: true,
    },
  });
  const eventIds = events.map((event) => event.id);
  const venueIds = events.map((event) => event.venueId);

  await prisma.idempotencyKey.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        {
          userId: {
            in: userIds,
          },
        },
        {
          eventId: {
            in: eventIds,
          },
        },
      ],
    },
  });
  await prisma.checkIn.deleteMany({
    where: {
      OR: [
        {
          eventId: {
            in: eventIds,
          },
        },
        {
          userId: {
            in: userIds,
          },
        },
      ],
    },
  });
  await prisma.eventCrewAccess.deleteMany({
    where: {
      OR: [
        {
          eventId: {
            in: eventIds,
          },
        },
        {
          userId: {
            in: userIds,
          },
        },
      ],
    },
  });
  await prisma.waitlistEntry.deleteMany({
    where: {
      OR: [
        {
          eventId: {
            in: eventIds,
          },
        },
        {
          userId: {
            in: userIds,
          },
        },
      ],
    },
  });
  await prisma.registration.deleteMany({
    where: {
      OR: [
        {
          eventId: {
            in: eventIds,
          },
        },
        {
          userId: {
            in: userIds,
          },
        },
      ],
    },
  });
  await prisma.eventLog.deleteMany({
    where: {
      eventId: {
        in: eventIds,
      },
    },
  });
  await prisma.event.deleteMany({
    where: {
      id: {
        in: eventIds,
      },
    },
  });
  await prisma.venue.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: venueIds,
          },
        },
        {
          name: {
            contains: RUN_ID,
          },
        },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
}

async function seedAuthzFixtures() {
  await cleanup();

  const [admin, organizerA, organizerB, volunteer, student] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Authz Admin",
        email: `admin.${RUN_ID}@example.test`,
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "Organizer A",
        email: `organizer-a.${RUN_ID}@example.test`,
        passwordHash,
        role: "ORGANIZER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Organizer B",
        email: `organizer-b.${RUN_ID}@example.test`,
        passwordHash,
        role: "ORGANIZER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Authz Volunteer",
        email: `volunteer.${RUN_ID}@example.test`,
        passwordHash,
        role: "VOLUNTEER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Authz Student",
        email: `student.${RUN_ID}@example.test`,
        passwordHash,
        role: "STUDENT",
      },
    }),
  ]);

  const venue = await prisma.venue.create({
    data: {
      name: `Authz Hall ${RUN_ID}`,
      location: "Security Wing",
      zone: "AUTHZ",
      capacity: 120,
      rows: 12,
      seatsPerRow: 10,
    },
  });
  const now = Date.now();
  const baseEvent = {
    description: "Authorization test event",
    venueId: venue.id,
    startTime: new Date(now + 5 * 24 * 60 * 60 * 1000),
    endTime: new Date(now + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    capacity: 50,
    waitlistCapacity: 10,
    registrationDeadline: new Date(now + 4 * 24 * 60 * 60 * 1000),
    status: "OPEN",
  };
  const [eventA, eventB] = await Promise.all([
    prisma.event.create({
      data: {
        ...baseEvent,
        title: `Organizer A Event ${RUN_ID}`,
        createdById: organizerA.id,
      },
    }),
    prisma.event.create({
      data: {
        ...baseEvent,
        title: `Organizer B Event ${RUN_ID}`,
        createdById: organizerB.id,
      },
    }),
  ]);

  const registration = await prisma.registration.create({
    data: {
      eventId: eventA.id,
      userId: student.id,
      status: "CONFIRMED",
      seatNumber: "A1",
    },
  });
  const crewAccess = await prisma.eventCrewAccess.create({
    data: {
      eventId: eventA.id,
      userId: student.id,
      assignedById: organizerA.id,
      gateName: "North Gate",
      accessType: "CREW",
      isActive: true,
    },
  });

  return {
    admin,
    organizerA,
    organizerB,
    volunteer,
    student,
    venue,
    eventA,
    eventB,
    registration,
    crewAccess,
  };
}

const describeAuthz = shouldRunAuthzTests ? describe : describe.skip;

describeAuthz("RBAC/ABAC authorization", () => {
  let fixtures;

  beforeAll(async () => {
    fixtures = await seedAuthzFixtures();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test("students cannot access organizer/admin-only data or mutate protected resources", async () => {
    await request(app)
      .get(`/api/analytics/events/${fixtures.eventA.id}`)
      .set(auth(fixtures.student))
      .expect(403);

    await request(app)
      .post("/api/events")
      .set(auth(fixtures.student))
      .send({
        title: "Student Event",
        description: "Forbidden",
        venueId: fixtures.venue.id,
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        capacity: 20,
        waitlistCapacity: 5,
        registrationDeadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        status: "OPEN",
      })
      .expect(403);

    await request(app)
      .post("/api/venues")
      .set(auth(fixtures.student))
      .send({
        name: "Student Venue",
        location: "Forbidden",
        zone: "X",
        capacity: 20,
        rows: 4,
        seatsPerRow: 5,
      })
      .expect(403);

    await request(app)
      .get(`/api/events/${fixtures.eventA.id}/crew`)
      .set(auth(fixtures.student))
      .expect(403);

    await request(app)
      .get(`/api/events/${fixtures.eventA.id}/checkins`)
      .set(auth(fixtures.student))
      .expect(403);
  });

  test("organizers can mutate and inspect owned events but not other organizers' events", async () => {
    await request(app)
      .patch(`/api/events/${fixtures.eventA.id}`)
      .set(auth(fixtures.organizerA))
      .send({
        title: `Organizer A Updated ${RUN_ID}`,
      })
      .expect(200);

    await request(app)
      .patch(`/api/events/${fixtures.eventB.id}`)
      .set(auth(fixtures.organizerA))
      .send({
        title: `Organizer A Should Not Update ${RUN_ID}`,
      })
      .expect(403);

    await request(app)
      .get(`/api/analytics/events/${fixtures.eventA.id}`)
      .set(auth(fixtures.organizerA))
      .expect(200);

    await request(app)
      .get(`/api/analytics/events/${fixtures.eventB.id}`)
      .set(auth(fixtures.organizerA))
      .expect(403);

    await request(app)
      .get(`/api/events/${fixtures.eventA.id}/crew`)
      .set(auth(fixtures.organizerA))
      .expect(200);

    await request(app)
      .get(`/api/events/${fixtures.eventB.id}/crew`)
      .set(auth(fixtures.organizerA))
      .expect(403);

    await request(app)
      .get(`/api/events/${fixtures.eventA.id}/checkins`)
      .set(auth(fixtures.organizerA))
      .expect(200);

    await request(app)
      .get(`/api/events/${fixtures.eventB.id}/checkins`)
      .set(auth(fixtures.organizerA))
      .expect(403);
  });

  test("volunteers can use scan-related flows but cannot mutate organizer/admin resources", async () => {
    await request(app)
      .post(`/api/events/${fixtures.eventA.id}/checkins/special-entry`)
      .set(auth(fixtures.volunteer))
      .set("Idempotency-Key", idempotencyKey("volunteer-special-entry"))
      .send({
        eventId: fixtures.eventA.id,
        userId: fixtures.student.id,
        gateName: "North Gate",
      })
      .expect(200);

    await request(app)
      .post("/api/events")
      .set(auth(fixtures.volunteer))
      .send({
        title: "Volunteer Event",
        description: "Forbidden",
        venueId: fixtures.venue.id,
        startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        capacity: 20,
        waitlistCapacity: 5,
        registrationDeadline: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
        status: "OPEN",
      })
      .expect(403);

    await request(app)
      .post("/api/venues")
      .set(auth(fixtures.volunteer))
      .send({
        name: "Volunteer Venue",
        location: "Forbidden",
        zone: "X",
        capacity: 20,
        rows: 4,
        seatsPerRow: 5,
      })
      .expect(403);

    await request(app)
      .get(`/api/analytics/events/${fixtures.eventA.id}`)
      .set(auth(fixtures.volunteer))
      .expect(403);

    await request(app)
      .patch(`/api/events/${fixtures.eventA.id}/crew/${fixtures.crewAccess.id}`)
      .set(auth(fixtures.volunteer))
      .set("Idempotency-Key", idempotencyKey("volunteer-crew-update"))
      .send({
        gateName: "South Gate",
      })
      .expect(403);
  });

  test("admins can access and manage protected resources", async () => {
    await request(app)
      .post("/api/venues")
      .set(auth(fixtures.admin))
      .send({
        name: `Admin Venue ${RUN_ID}`,
        location: "Admin Wing",
        zone: "ADMIN",
        capacity: 30,
        rows: 5,
        seatsPerRow: 6,
      })
      .expect(201);

    await request(app)
      .get(`/api/analytics/events/${fixtures.eventB.id}`)
      .set(auth(fixtures.admin))
      .expect(200);

    await request(app)
      .patch(`/api/events/${fixtures.eventB.id}`)
      .set(auth(fixtures.admin))
      .send({
        title: `Admin Updated Event ${RUN_ID}`,
      })
      .expect(200);

    await request(app)
      .post(`/api/events/${fixtures.eventB.id}/crew`)
      .set(auth(fixtures.admin))
      .set("Idempotency-Key", idempotencyKey("admin-crew-create"))
      .send({
        userId: fixtures.volunteer.id,
        gateName: "Admin Gate",
        accessType: "VOLUNTEER_HELPER",
        note: "Admin assigned",
      })
      .expect(201);
  });
});
