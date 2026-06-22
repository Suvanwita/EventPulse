const helmet = require("helmet");

const env = require("../config/env");

function getFrontendOrigin() {
  try {
    return new URL(env.FRONTEND_URL).origin;
  } catch {
    return "'self'";
  }
}

function createSecurityMiddleware() {
  const frontendOrigin = getFrontendOrigin();
  const isProduction = process.env.NODE_ENV === "production";

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'", frontendOrigin],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: {
      policy: "same-origin",
    },
    crossOriginResourcePolicy: {
      policy: "same-site",
    },
    hsts: isProduction
      ? {
          maxAge: 15552000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    noSniff: true,
    referrerPolicy: {
      policy: "no-referrer",
    },
  });
}

module.exports = {
  createSecurityMiddleware,
};
