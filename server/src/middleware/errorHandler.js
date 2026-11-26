import { ZodError } from 'zod';
import multer from 'multer';
import { logger } from '../utils/logger.js';

/**
 * Central Express error handler converting known errors and unexpected failures into JSON responses.
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file exceeds the 5 MB size limit'
        : `File upload error: ${err.message}`;
    return res.status(400).json({ error: message, code: err.code });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const statusCode = err.statusCode || 500;
  const logPayload = {
    err: {
      name: err.name,
      message: err.message,
      stack: statusCode >= 500 ? err.stack : undefined,
    },
    method: req.method,
    path: req.originalUrl,
    statusCode,
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'Unhandled server error');
  } else {
    logger.warn(logPayload, 'Request rejected');
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
}
