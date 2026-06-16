const ApiError = require("../../utils/ApiError");

const PUBLIC_REGISTRATION_ROLES = ["STUDENT", "ORGANIZER", "VOLUNTEER"];

function validateRegisterInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role || "STUDENT";

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
    throw new ApiError(403, "This role cannot be created through public registration");
  }

  return {
    name,
    email,
    password,
    role,
  };
}

function validateLoginInput(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  return {
    email,
    password,
  };
}

module.exports = {
  validateRegisterInput,
  validateLoginInput,
};
