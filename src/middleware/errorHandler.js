const ApiError = require('../utils/ApiError');

exports.notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message;

  if (err.code === 11000) {            // Mongo duplicate key (e.g. race on unique email)
    status = 409;
    message = 'An account with this email already exists';
  } else if (err.type === 'entity.parse.failed') { // malformed JSON body
    status = 400;
    message = 'Malformed JSON in request body';
  } else if (status === 500) {
    console.error(err);
    message = 'Internal server error'; // don't leak internals
  }

  res.status(status).json({ status: 'error', message, ...(err.details && { errors: err.details }) });
};
