import logger from '../../../utils/logger.js';
import { successResult, failureResult } from '../helpers/serviceResult.js';
import { ServiceError } from '../helpers/serviceError.js';

/**
 * Enterprise BaseService Class
 * Single-responsibility base class providing logging, result formatting, and transaction wrappers.
 */
export class BaseService {
  constructor(serviceName = 'BaseService') {
    this.serviceName = serviceName;
    this.logger = logger;
  }

  logInfo(message, context = {}) {
    this.logger.info(`[${this.serviceName}] ${message}`, context);
  }

  logError(message, error = null) {
    this.logger.error(`[${this.serviceName}] ${message}`, error ? error.stack || error.message : '');
  }

  success(data = null, message = 'Success', code = 'OK') {
    return successResult(data, message, code);
  }

  failure(error = 'Service failure', code = 'SERVICE_ERROR', details = []) {
    return failureResult(error, code, details);
  }

  async executeSafely(operation, errorMessage = 'Operation failed', errorCode = 'OPERATION_ERROR') {
    try {
      const data = await operation();
      return this.success(data);
    } catch (err) {
      this.logError(errorMessage, err);
      if (err instanceof ServiceError) {
        return this.failure(err.message, err.code, err.details);
      }
      return this.failure(errorMessage, errorCode, [err.message]);
    }
  }
}

export default BaseService;
