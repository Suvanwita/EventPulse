const { ZodError } = require("zod");

const ApiError = require("../utils/ApiError");

function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "request",
    message: issue.message,
    code: issue.code,
  }));
}

function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.query !== undefined) {
        Object.defineProperty(req, "query", {
          value: parsed.query,
          enumerable: true,
          configurable: true,
        });
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ApiError(400, "Invalid request", formatZodError(error)));
      }

      return next(error);
    }
  };
}

module.exports = validateRequest;
