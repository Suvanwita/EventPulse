const { connectProducer } = require("../config/kafka");
const { DLQ_TOPICS, RETRY_TOPICS, TOPICS } = require("./kafkaTopics");
const {
  formatKafkaValidationError,
  validateKafkaMessage,
} = require("./kafkaSchemas");

function normalizePayload(payload = {}) {
  return {
    eventId: payload.eventId,
    userId: payload.userId || null,
    registrationId: payload.registrationId || null,
    timestamp: payload.timestamp || new Date().toISOString(),
    metadata: payload.metadata || {},
  };
}

async function publishKafkaMessage(topic, message, options = {}) {
  const producer = await connectProducer();
  const value = typeof message === "string" ? message : JSON.stringify(message);

  await producer.send({
    topic,
    messages: [
      {
        key: options.key,
        value,
        headers: options.headers,
      },
    ],
  });

  return {
    published: true,
    topic,
  };
}

async function publishEvent(topic, payload) {
  try {
    const message = normalizePayload(payload);
    validateKafkaMessage(topic, message, "outgoing message");

    await publishKafkaMessage(topic, message, {
      key: message.eventId || message.userId || undefined,
    });

    return {
      published: true,
      topic,
      payload: message,
    };
  } catch (error) {
    console.error(
      `Kafka publish failed for topic ${topic}:`,
      formatKafkaValidationError(error) || error
    );

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

function publishCrewAccessGranted(payload) {
  return publishEvent(TOPICS.CREW_ACCESS_GRANTED, payload);
}

function publishCrewAccessUpdated(payload) {
  return publishEvent(TOPICS.CREW_ACCESS_UPDATED, payload);
}

function publishCrewAccessRevoked(payload) {
  return publishEvent(TOPICS.CREW_ACCESS_REVOKED, payload);
}

function publishCrewSpecialEntryUsed(payload) {
  return publishEvent(TOPICS.CREW_SPECIAL_ENTRY_USED, payload);
}

module.exports = {
  DLQ_TOPICS,
  RETRY_TOPICS,
  TOPICS,
  publishKafkaMessage,
  publishEvent,
  publishCrewAccessGranted,
  publishCrewAccessRevoked,
  publishCrewAccessUpdated,
  publishCrewSpecialEntryUsed,
  publishRegistrationCreated,
  publishWaitlistJoined,
  publishWaitlistPromoted,
  publishRegistrationCancelled,
  publishCheckinCompleted,
  publishScanFailed,
  publishNoShowReleased,
};
