import LoggerService from '../../services/shared/LoggerService.js';

/**
 * Enterprise Base AI Adapter
 */
export class BaseAIAdapter {
  constructor(providerName = 'BaseProvider', config = {}) {
    this.providerName = providerName;
    this.config = config;
  }

  async generateCompletion(prompt, options = {}) {
    LoggerService.info(`[${this.providerName}] Execution placeholder for prompt`);
    return { text: '', provider: this.providerName };
  }

  async generateJSON(prompt, schema = null, options = {}) {
    return { data: {}, provider: this.providerName };
  }

  async embedText(text) {
    return { embedding: [], provider: this.providerName };
  }
}

export default BaseAIAdapter;
