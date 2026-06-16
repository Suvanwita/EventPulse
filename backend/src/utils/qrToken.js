const crypto = require("crypto");

const env = require("../config/env");
const ApiError = require("./ApiError");

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function requireJwtSecret() {
  if (!env.JWT_SECRET) {
    throw new ApiError(500, "JWT secret is not configured");
  }

  return env.JWT_SECRET;
}

function normalizePayload(payload) {
  return {
    eventId: payload.eventId,
    userId: payload.userId,
    registrationId: payload.registrationId,
    expiry:
      payload.expiry instanceof Date
        ? payload.expiry.toISOString()
        : new Date(payload.expiry).toISOString(),
  };
}

function generateQrPayload(eventId, userId, registrationId, expiry) {
  return normalizePayload({
    eventId,
    userId,
    registrationId,
    expiry,
  });
}

function signQrPayload(payload) {
  const normalizedPayload = normalizePayload(payload);

  return crypto
    .createHmac("sha256", requireJwtSecret())
    .update(JSON.stringify(normalizedPayload))
    .digest("hex");
}

function generateQrToken(payload) {
  const normalizedPayload = normalizePayload(payload);
  const signedPayload = {
    ...normalizedPayload,
    signature: signQrPayload(normalizedPayload),
  };

  return base64UrlEncode(JSON.stringify(signedPayload));
}

function verifyQrToken(token) {
  let decoded;

  try {
    decoded = JSON.parse(base64UrlDecode(token));
  } catch (error) {
    throw new ApiError(401, "Invalid QR token");
  }

  const { signature, ...payload } = decoded;
  const expectedSignature = signQrPayload(payload);

  const signatureMatches =
    typeof signature === "string" &&
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

  if (!signatureMatches) {
    throw new ApiError(401, "Invalid QR token signature");
  }

  if (new Date(payload.expiry) < new Date()) {
    throw new ApiError(401, "QR token expired");
  }

  return {
    ...payload,
    signature,
  };
}

function hashQrToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  generateQrPayload,
  signQrPayload,
  generateQrToken,
  verifyQrToken,
  hashQrToken,
};
