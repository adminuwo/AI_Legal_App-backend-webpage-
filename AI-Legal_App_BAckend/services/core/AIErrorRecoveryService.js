import BaseService from './base/BaseService.js';
import { withRetry } from '../shared/utils/RetryHelper.js';
import LoggerService from '../shared/LoggerService.js';

/**
 * Enterprise AIErrorRecoveryService Component
 * Encapsulates exponential retry policy, timeout handling, and exception mapping.
 */
export class AIErrorRecoveryService extends BaseService {
  constructor() {
    super('AIErrorRecoveryService');
  }

  async executeWithRecovery(operation, retries = 3, delayMs = 1000) {
    LoggerService.info('[AIErrorRecoveryService] Executing operation with retry policy');
    try {
      return await withRetry(operation, retries, delayMs);
    } catch (err) {
      LoggerService.error('[AIErrorRecoveryService] Operation recovery exhausted:', err);
      throw err;
    }
  }
}

export default AIErrorRecoveryService;
