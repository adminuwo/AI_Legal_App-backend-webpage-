/**
 * Custom Enterprise Service Exception
 */
export class ServiceError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Application error code
   * @param {number} statusCode - HTTP status code suggestion
   * @param {Array} details - Additional error details
   */
  constructor(message = 'Service execution failed', code = 'SERVICE_ERROR', statusCode = 500, details = []) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export default ServiceError;
