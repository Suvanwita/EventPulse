const { AbilityBuilder, createMongoAbility, subject } = require("@casl/ability");

const ApiError = require("../utils/ApiError");

const ACTIONS = {
  ACCESS: "access",
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
  PROMOTE: "promote",
  READ: "read",
  SCAN: "scan",
  UPDATE: "update",
};

const SUBJECTS = {
  ALL: "all",
  ANALYTICS: "Analytics",
  CHECK_IN: "CheckIn",
  EVENT: "Event",
  EVENT_CREW_ACCESS: "EventCrewAccess",
  GATE_FLOW: "GateFlow",
  NOTIFICATION: "Notification",
  PASS: "Pass",
  REGISTRATION: "Registration",
  SEARCH: "Search",
  VENUE: "Venue",
  VENUE_SCHEDULE: "VenueSchedule",
  WAITLIST: "Waitlist",
};

function detectSubjectType(item) {
  if (typeof item === "string") {
    return item;
  }

  return item.__caslSubjectType__ || item.constructor?.modelName || item.constructor?.name;
}

function defineAbilityFor(user) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (!user) {
    return build({ detectSubjectType });
  }

  can(ACTIONS.READ, SUBJECTS.EVENT);
  can(ACTIONS.READ, SUBJECTS.SEARCH);
  can(ACTIONS.READ, SUBJECTS.NOTIFICATION, { userId: user.id });

  switch (user.role) {
    case "ADMIN":
      can(ACTIONS.MANAGE, SUBJECTS.ALL);
      cannot([ACTIONS.CREATE, ACTIONS.DELETE], SUBJECTS.REGISTRATION);
      break;

    case "ORGANIZER":
      can(ACTIONS.CREATE, SUBJECTS.EVENT);
      can([ACTIONS.UPDATE, ACTIONS.DELETE], SUBJECTS.EVENT, { createdById: user.id });

      can(ACTIONS.READ, SUBJECTS.VENUE);
      can(ACTIONS.READ, SUBJECTS.VENUE_SCHEDULE);
      can(ACTIONS.ACCESS, SUBJECTS.ANALYTICS);
      can(ACTIONS.READ, SUBJECTS.ANALYTICS, { createdById: user.id });
      can(ACTIONS.ACCESS, SUBJECTS.WAITLIST);
      can([ACTIONS.READ, ACTIONS.PROMOTE], SUBJECTS.WAITLIST, { createdById: user.id });
      can(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS);
      can([ACTIONS.READ, ACTIONS.MANAGE], SUBJECTS.EVENT_CREW_ACCESS, {
        createdById: user.id,
      });
      can(ACTIONS.ACCESS, SUBJECTS.CHECK_IN);
      can(ACTIONS.SCAN, SUBJECTS.CHECK_IN);
      can(ACTIONS.READ, SUBJECTS.CHECK_IN, { createdById: user.id });
      can(ACTIONS.READ, SUBJECTS.GATE_FLOW);
      can(ACTIONS.READ, SUBJECTS.PASS);
      break;

    case "VOLUNTEER":
      can(ACTIONS.ACCESS, SUBJECTS.CHECK_IN);
      can([ACTIONS.SCAN, ACTIONS.READ], SUBJECTS.CHECK_IN);
      can(ACTIONS.READ, SUBJECTS.GATE_FLOW);
      can(ACTIONS.ACCESS, SUBJECTS.EVENT_CREW_ACCESS);
      can(ACTIONS.READ, SUBJECTS.EVENT_CREW_ACCESS);
      can(ACTIONS.READ, SUBJECTS.PASS, { userId: user.id });
      break;

    case "STUDENT":
      can([ACTIONS.CREATE, ACTIONS.READ, ACTIONS.DELETE], SUBJECTS.REGISTRATION);
      can(ACTIONS.READ, SUBJECTS.PASS, { userId: user.id });
      can(ACTIONS.READ, SUBJECTS.EVENT_CREW_ACCESS, { userId: user.id });
      break;

    default:
      break;
  }

  return build({ detectSubjectType });
}

function asSubject(subjectName, attributes = {}) {
  return subject(subjectName, attributes);
}

function can(user, action, resource) {
  return defineAbilityFor(user).can(action, resource);
}

function authorize(user, action, resource) {
  if (!can(user, action, resource)) {
    throw new ApiError(403, "Forbidden");
  }
}

module.exports = {
  ACTIONS,
  SUBJECTS,
  asSubject,
  authorize,
  can,
  defineAbilityFor,
};
