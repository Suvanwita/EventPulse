const { connectProducer } = require("../config/kafka");

const TOPICS = {
  REGISTRATION_CREATED: "eventpulse.registration.created",
  WAITLIST_JOINED: "eventpulse.waitlist.joined",
  WAITLIST_PROMOTED: "eventpulse.waitlist.promoted",
  REGISTRATION_CANCELLED: "eventpulse.registration.cancelled",
  CHECKIN_COMPLETED: "eventpulse.checkin.completed",
  SCAN_FAILED: "eventpulse.security.scan_failed",
  NO_SHOW_RELEASED: "eventpulse.no_show.released",
};

function normalizePayload(payload = {}) {
  return {
    eventId: payload.eventId,
    userId: payload.userId || null,
    registrationId: payload.registrationId || null,
    timestamp: payload.timestamp || new Date().toISOString(),
    metadata: payload.metadata || {},
  };
}

async function publishEvent(topic, payload) {
  try {
    const producer = await connectProducer();
    const message = normalizePayload(payload);

    await producer.send({
      topic,
      messages: [
        {
          key: message.eventId || message.userId || undefined,
          value: JSON.stringify(message),
        },
      ],
    });

    return {
      published: true,
      topic,
      payload: message,
    };
  } catch (error) {
    console.error(`Kafka publish failed for topic ${topic}:`, error);

    return {
      published: false,
      topic,
      error,
    };
  }
}

function publishRegistrationCreated(payload) {
  return publishEvent(TOPICS.REGISTRATION_CREATED, payload);
}

function publishWaitlistJoined(payload) {
  return publishEvent(TOPICS.WAITLIST_JOINED, payload);
}

function publishWaitlistPromoted(payload) {
  return publishEvent(TOPICS.WAITLIST_PROMOTED, payload);
}

function publishRegistrationCancelled(payload) {
  return publishEvent(TOPICS.REGISTRATION_CANCELLED, payload);
}

function publishCheckinCompleted(payload) {
  return publishEvent(TOPICS.CHECKIN_COMPLETED, payload);
}

function publishScanFailed(payload) {
  return publishEvent(TOPICS.SCAN_FAILED, payload);
}

function publishNoShowReleased(payload) {
  return publishEvent(TOPICS.NO_SHOW_RELEASED, payload);
}

module.exports = {
  TOPICS,
  publishEvent,
  publishRegistrationCreated,
  publishWaitlistJoined,
  publishWaitlistPromoted,
  publishRegistrationCancelled,
  publishCheckinCompleted,
  publishScanFailed,
  publishNoShowReleased,
};
