import { BadRequestError } from '../utils/errors.js';

/**
 * Validate req.body, req.query, and/or req.params against Zod schemas.
 */
export function validateRequest({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (params) {
        req.params = params.parse(req.params);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      if (body) {
        req.body = body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(err);
      }
      return next(new BadRequestError(err.message));
    }
  };
}
