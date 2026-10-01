// Error with an HTTP status code, so controllers can just `throw new ApiError(404, '...')`.
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
module.exports = ApiError;
