const TOPICS = {
  REGISTRATION_CREATED: "eventpulse.registration.created",
  WAITLIST_JOINED: "eventpulse.waitlist.joined",
  WAITLIST_PROMOTED: "eventpulse.waitlist.promoted",
  REGISTRATION_CANCELLED: "eventpulse.registration.cancelled",
  CHECKIN_COMPLETED: "eventpulse.checkin.completed",
  SCAN_FAILED: "eventpulse.security.scan_failed",
  NO_SHOW_RELEASED: "eventpulse.no_show.released",
  CREW_ACCESS_GRANTED: "eventpulse.crew.access_granted",
  CREW_ACCESS_UPDATED: "eventpulse.crew.access_updated",
  CREW_ACCESS_REVOKED: "eventpulse.crew.access_revoked",
  CREW_SPECIAL_ENTRY_USED: "eventpulse.crew.special_entry_used",
};

const RETRY_TOPICS = {
  REGISTRATION: "eventpulse.retry.registration",
  CHECKIN: "eventpulse.retry.checkin",
  CREW: "eventpulse.retry.crew",
};

const DLQ_TOPICS = {
  REGISTRATION: "eventpulse.dlq.registration",
  CHECKIN: "eventpulse.dlq.checkin",
  CREW: "eventpulse.dlq.crew",
};

module.exports = {
  DLQ_TOPICS,
  RETRY_TOPICS,
  TOPICS,
};
