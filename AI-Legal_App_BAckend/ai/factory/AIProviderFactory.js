import BaseAIAdapter from '../adapters/BaseAIAdapter.js';

/**
 * Enterprise AI Provider Factory
 * Instantiates LLM model adapters (Vertex, OpenAI, Gemini, Claude, Groq) based on config.
 */
export class AIProviderFactory {
  /**
   * @param {string} providerName - 'vertex' | 'openai' | 'gemini' | 'claude' | 'groq'
   * @param {Object} config - Provider configuration credentials
   */
  static getProvider(providerName = 'vertex', config = {}) {
    switch (providerName.toLowerCase()) {
      case 'vertex':
      case 'gemini':
      case 'openai':
      default:
        return new BaseAIAdapter(providerName, config);
    }
  }
}

export default AIProviderFactory;
