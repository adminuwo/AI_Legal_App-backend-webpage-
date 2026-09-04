import { ServiceError } from '../core/helpers/serviceError.js';

/**
 * Enterprise Unified Error Service
 */
export class ErrorService {
  static createError(message, code = 'INTERNAL_ERROR', statusCode = 500, details = []) {
    return new ServiceError(message, code, statusCode, details);
  }

  static badRequest(message = 'Invalid request parameters', details = []) {
    return new ServiceError(message, 'BAD_REQUEST', 400, details);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ServiceError(message, 'UNAUTHORIZED', 401, []);
  }

  static forbidden(message = 'Access forbidden') {
    return new ServiceError(message, 'FORBIDDEN', 403, []);
  }

  static notFound(message = 'Requested resource not found') {
    return new ServiceError(message, 'NOT_FOUND', 404, []);
  }
}

export default ErrorService;
