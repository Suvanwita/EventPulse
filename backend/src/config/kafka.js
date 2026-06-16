const { Kafka } = require("kafkajs");

const env = require("./env");

const kafka = new Kafka({
  clientId: "eventpulse-backend",
  brokers: [env.KAFKA_BROKER],
  connectionTimeout: 1000,
  retry: {
    retries: 0,
  },
});

let producer;
let producerConnected = false;

function getProducer() {
  if (!producer) {
    producer = kafka.producer();
  }

  return producer;
}

async function connectProducer() {
  const kafkaProducer = getProducer();

  if (!producerConnected) {
    await kafkaProducer.connect();
    producerConnected = true;
  }

  return kafkaProducer;
}

async function disconnectProducer() {
  if (producer && producerConnected) {
    await producer.disconnect();
    producerConnected = false;
  }
}

module.exports = {
  kafka,
  getProducer,
  connectProducer,
  disconnectProducer,
};
