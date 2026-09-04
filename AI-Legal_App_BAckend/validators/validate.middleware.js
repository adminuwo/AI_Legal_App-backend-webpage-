import { formatValidationError } from './error.formatter.js';

/**
 * Enterprise Reusable Generic Validation Middleware Generator
 * @param {Object} schema - Validation schema object defining body, query, or params rules
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    if (!schema) {
      return next();
    }

    try {
      const details = [];

      // Validate Request Body
      if (schema.body && typeof schema.body === 'function') {
        const bodyError = await schema.body(req.body);
        if (bodyError) details.push(...(Array.isArray(bodyError) ? bodyError : [bodyError]));
      }

      // Validate Request Query
      if (schema.query && typeof schema.query === 'function') {
        const queryError = await schema.query(req.query);
        if (queryError) details.push(...(Array.isArray(queryError) ? queryError : [queryError]));
      }

      // Validate Request Params
      if (schema.params && typeof schema.params === 'function') {
        const paramsError = await schema.params(req.params);
        if (paramsError) details.push(...(Array.isArray(paramsError) ? paramsError : [paramsError]));
      }

      if (details.length > 0) {
        return res.status(400).json(formatValidationError('INVALID_PAYLOAD', 'Validation failed for request parameters', details));
      }

      next();
    } catch (err) {
      console.error('[VALIDATION ERROR]', err.message);
      return res.status(400).json(formatValidationError('VALIDATION_EXCEPTION', err.message, []));
    }
  };
};

export default validate;
