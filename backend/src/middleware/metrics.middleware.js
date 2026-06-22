const { httpRequestDuration, httpRequestsTotal } = require("../observability/metrics");

function sanitizeRoutePattern(route) {
  return route
    .replace(/\/api\/events\/[^/]+/g, "/api/events/:id")
    .replace(/\/api\/analytics\/events\/[^/]+/g, "/api/analytics/events/:id")
    .replace(/\/api\/venues\/[^/]+/g, "/api/venues/:id")
    .replace(/\/api\/notifications\/[^/]+/g, "/api/notifications/:id")
    .replace(/\/crew\/[^/]+/g, "/crew/:crewAccessId");
}

function getRouteLabel(req) {
  if (req.route?.path) {
    return sanitizeRoutePattern(`${req.baseUrl || ""}${req.route.path}`);
  }

  return "unmatched";
}

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    if (req.path === "/metrics") {
      return;
    }

    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
  });

  next();
}

module.exports = metricsMiddleware;
