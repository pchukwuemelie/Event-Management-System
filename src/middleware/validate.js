const ApiError = require('../utils/ApiError');

/**
 * Validates req[source] against a Joi schema.
 * On success, replaces req[source] with the sanitized value (trimmed, lowercased, unknown keys stripped).
 */
module.exports = (schema, source = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, ''),
    }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  // req.query is a getter in newer Express versions, so mutate instead of reassigning.
  if (source === 'query') {
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, value);
  } else {
    req[source] = value;
  }
  next();
};
