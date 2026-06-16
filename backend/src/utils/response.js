function success(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function created(res, message, data = null) {
  return success(res, 201, message, data);
}

module.exports = {
  success,
  created,
};
