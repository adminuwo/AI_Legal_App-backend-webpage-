import { successResult, failureResult } from '../core/helpers/serviceResult.js';

/**
 * Enterprise Standardized Result Service Factory
 */
export class ResultService {
  static ok(data = null, message = 'Operation completed successfully', code = 'OK') {
    return successResult(data, message, code);
  }

  static fail(error = 'Operation failed', code = 'OPERATION_FAILED', details = []) {
    return failureResult(error, code, details);
  }
}

export default ResultService;
