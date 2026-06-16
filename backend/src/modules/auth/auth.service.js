const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");

const SALT_ROUNDS = 10;

function createToken(user) {
  if (!env.JWT_SECRET) {
    throw new ApiError(500, "JWT secret is not configured");
  }

  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    env.JWT_SECRET
  );
}

async function register(input) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
    });

    return safeUser(user);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "Email is already registered");
    }

    throw error;
  }
}

async function login(input) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  return {
    token: createToken(user),
    user: safeUser(user),
  };
}

function getCurrentUser(user) {
  return safeUser(user);
}

module.exports = {
  register,
  login,
  getCurrentUser,
};
