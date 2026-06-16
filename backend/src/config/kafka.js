const { Kafka } = require("kafkajs");

const env = require("./env");

const kafka = new Kafka({
  clientId: "eventpulse-backend",
  brokers: [env.KAFKA_BROKER],
});

module.exports = kafka;
