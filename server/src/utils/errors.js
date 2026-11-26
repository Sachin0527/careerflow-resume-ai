/**
 * Application error with explicit HTTP status code and optional structured details.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', details) {
    super(message, 422, details);
    this.name = 'UnprocessableEntityError';
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message = 'Upstream AI request timed out', details) {
    super(message, 504, details);
    this.name = 'TimeoutError';
  }
}
