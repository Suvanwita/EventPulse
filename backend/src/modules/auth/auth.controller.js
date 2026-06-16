const asyncHandler = require("../../utils/asyncHandler");
const response = require("../../utils/response");
const authService = require("./auth.service");
const {
  validateLoginInput,
  validateRegisterInput,
} = require("./auth.validation");

const register = asyncHandler(async (req, res) => {
  const input = validateRegisterInput(req.body);
  const user = await authService.register(input);

  return response.created(res, "Registration successful", {
    user,
  });
});

const login = asyncHandler(async (req, res) => {
  const input = validateLoginInput(req.body);
  const data = await authService.login(input);

  return response.success(res, 200, "Login successful", data);
});

const me = asyncHandler(async (req, res) => {
  const user = authService.getCurrentUser(req.user);

  return response.success(res, 200, "Current user fetched", {
    user,
  });
});

module.exports = {
  register,
  login,
  me,
};
