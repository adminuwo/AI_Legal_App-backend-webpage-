import BaseService from './base/BaseService.js';
import { estimateTokens } from '../ai/helpers/aiUtils.js';
import LoggerService from '../shared/LoggerService.js';

/**
 * Enterprise TokenManagementService Component
 * Encapsulates token estimation, counting, usage tracking, and cost calculation.
 */
export class TokenManagementService extends BaseService {
  constructor() {
    super('TokenManagementService');
  }

  estimateTokenCount(text = '') {
    return estimateTokens(text);
  }

  trackUsage(userId, inputTokens, outputTokens, modelName = 'gemini-1.5-pro') {
    const totalTokens = inputTokens + outputTokens;
    LoggerService.info(`[TokenManagementService] User: ${userId} | Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Model: ${modelName}`);
    return {
      userId,
      inputTokens,
      outputTokens,
      totalTokens,
      modelName
    };
  }
}

export default TokenManagementService;
