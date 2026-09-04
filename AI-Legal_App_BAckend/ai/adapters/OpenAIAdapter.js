import BaseAIAdapter from './BaseAIAdapter.js';

/**
 * OpenAI Adapter Skeleton
 */
export class OpenAIAdapter extends BaseAIAdapter {
  constructor(config = {}) {
    super('OpenAI', config);
  }
}

export default OpenAIAdapter;
