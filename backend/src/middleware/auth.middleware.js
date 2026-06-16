const jwt = require("jsonwebtoken");

const env = require("../config/env");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const safeUser = require("../utils/safeUser");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1];

  if (!env.JWT_SECRET) {
    throw new ApiError(500, "JWT secret is not configured");
  }

  let payload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired");
    }

    throw new ApiError(401, "Invalid token");
  }

  const userId = payload.id || payload.userId || payload.sub;

  if (!userId) {
    throw new ApiError(401, "Invalid token payload");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = safeUser(user);
  next();
});

module.exports = authMiddleware;
