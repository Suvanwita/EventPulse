const { z } = require("zod");

const roles = ["STUDENT", "ORGANIZER", "VOLUNTEER"];
const eventStatuses = ["DRAFT", "OPEN", "CLOSED", "LIVE", "COMPLETED", "CANCELLED"];
const crewAccessTypes = [
  "EVENT_ORGANIZER",
  "CREW",
  "PERFORMER",
  "SPEAKER",
  "VOLUNTEER_HELPER",
  "VIP_ENTRY",
];

const trimmedString = z.string().trim();
const nonEmptyString = trimmedString.min(1);
const idParam = z.object({
  id: nonEmptyString,
});
const crewAccessParam = idParam.extend({
  crewAccessId: nonEmptyString,
});
const emptyBody = z.object({}).passthrough().optional();

const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().min(0);
const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const authSchemas = {
  register: z.object({
    body: z.object({
      name: nonEmptyString,
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(6),
      role: z.enum(roles).default("STUDENT"),
    }),
  }),
  login: z.object({
    body: z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1),
    }),
  }),
};

const eventBaseBody = z.object({
  title: nonEmptyString,
  description: trimmedString.default(""),
  venueId: nonEmptyString,
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  capacity: positiveInt,
  waitlistCapacity: nonNegativeInt,
  registrationDeadline: z.coerce.date(),
  status: z.enum(eventStatuses).default("DRAFT"),
});

const eventBody = eventBaseBody.refine((data) => data.startTime < data.endTime, {
  path: ["endTime"],
  message: "endTime must be after startTime",
}).refine((data) => data.registrationDeadline < data.startTime, {
  path: ["registrationDeadline"],
  message: "registrationDeadline must be before startTime",
});

const eventUpdateBody = eventBaseBody.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one event field is required",
}).refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
  path: ["endTime"],
  message: "endTime must be after startTime",
}).refine((data) => !data.registrationDeadline || !data.startTime || data.registrationDeadline < data.startTime, {
  path: ["registrationDeadline"],
  message: "registrationDeadline must be before startTime",
});

const eventSchemas = {
  create: z.object({
    body: eventBody,
  }),
  update: z.object({
    params: idParam,
    body: eventUpdateBody,
  }),
  id: z.object({
    params: idParam,
  }),
  list: z.object({
    query: z.object({
      status: z.enum(eventStatuses).optional(),
      venueId: nonEmptyString.optional(),
      search: trimmedString.optional(),
      upcoming: z.enum(["true", "false"]).optional(),
      createdByMe: z.enum(["true", "false"]).optional(),
    }).partial(),
  }),
};

const venueBaseBody = z.object({
  name: nonEmptyString,
  location: nonEmptyString,
  zone: nonEmptyString,
  capacity: positiveInt,
  rows: positiveInt,
  seatsPerRow: positiveInt,
});

const venueBody = venueBaseBody.refine((data) => data.rows * data.seatsPerRow >= data.capacity, {
  path: ["seatsPerRow"],
  message: "rows * seatsPerRow must be greater than or equal to capacity",
});

const venueUpdateBody = venueBaseBody.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one venue field is required",
}).refine((data) => {
  if (data.capacity === undefined || data.rows === undefined || data.seatsPerRow === undefined) {
    return true;
  }

  return data.rows * data.seatsPerRow >= data.capacity;
}, {
  path: ["seatsPerRow"],
  message: "rows * seatsPerRow must be greater than or equal to capacity",
});

const venueSchemas = {
  create: z.object({
    body: venueBody,
  }),
  update: z.object({
    params: idParam,
    body: venueUpdateBody,
  }),
  id: z.object({
    params: idParam,
  }),
};

const checkinSchemas = {
  scan: z.object({
    body: z.object({
      qrToken: nonEmptyString,
      gateName: nonEmptyString,
    }),
  }),
  specialEntry: z.object({
    body: z.object({
      eventId: nonEmptyString,
      userId: nonEmptyString,
      gateName: nonEmptyString,
    }),
  }),
};

const crewSchemas = {
  create: z.object({
    params: idParam,
    body: z.object({
      userId: nonEmptyString,
      gateName: nonEmptyString,
      accessType: z.enum(crewAccessTypes),
      note: trimmedString.nullish().transform((value) => value || null),
    }),
  }),
  update: z.object({
    params: crewAccessParam,
    body: z.object({
      gateName: nonEmptyString.optional(),
      accessType: z.enum(crewAccessTypes).optional(),
      note: trimmedString.nullish().transform((value) => value ?? null).optional(),
      isActive: z.boolean().optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: "At least one crew access field is required",
    }),
  }),
  id: z.object({
    params: idParam,
  }),
  accessId: z.object({
    params: crewAccessParam,
  }),
};

const analyticsSchemas = {
  eventTimeRange: z.object({
    params: idParam,
    query: z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      bucketMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    }).refine((data) => !data.startTime || !data.endTime || new Date(data.startTime) <= new Date(data.endTime), {
      path: ["endTime"],
      message: "endTime must be after or equal to startTime",
    }),
  }),
  eventId: z.object({
    params: idParam,
  }),
};

const notificationSchemas = {
  list: z.object({
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
      unread: optionalBooleanQuery,
    }).partial(),
  }),
  id: z.object({
    params: idParam,
  }),
};

const searchSchemas = {
  suggestions: z.object({
    query: z.object({
      q: trimmedString.default(""),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    }),
  }),
};

const passSchemas = {
  get: z.object({
    params: idParam,
    query: z.object({
      userId: nonEmptyString.optional(),
    }).partial(),
  }),
};

const requestSchemas = {
  analytics: analyticsSchemas,
  auth: authSchemas,
  checkin: checkinSchemas,
  crew: crewSchemas,
  emptyBody: z.object({
    body: emptyBody,
  }),
  events: eventSchemas,
  notifications: notificationSchemas,
  passes: passSchemas,
  search: searchSchemas,
  venues: venueSchemas,
};

module.exports = requestSchemas;
