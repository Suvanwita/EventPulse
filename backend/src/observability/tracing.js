const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { NodeSDK } = require("@opentelemetry/sdk-node");

let sdk = null;

function isTracingEnabled() {
  return String(process.env.OTEL_ENABLED || process.env.OBSERVABILITY_ENABLED || "false").toLowerCase() === "true";
}

function initTracing() {
  if (!isTracingEnabled() || sdk) {
    return sdk;
  }

  if (String(process.env.OTEL_DIAG_LOGGING || "false").toLowerCase() === "true") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/traces`,
      })
    : undefined;

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || "eventpulse-backend",
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();
  return sdk;
}

async function shutdownTracing() {
  if (!sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = null;
}

initTracing();

module.exports = {
  initTracing,
  isTracingEnabled,
  shutdownTracing,
};
