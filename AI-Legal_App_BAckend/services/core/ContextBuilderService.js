import BaseService from './base/BaseService.js';
import LoggerService from '../shared/LoggerService.js';

/**
 * Enterprise ContextBuilderService Component
 * Encapsulates multi-dimensional context assembly (conversation, workspace, case, timeline, evidence).
 */
export class ContextBuilderService extends BaseService {
  constructor() {
    super('ContextBuilderService');
  }

  /**
   * Assemble Composite RAG Context
   */
  async buildCompositeContext(conversationHistory = [], caseContext = '', ragDocs = []) {
    LoggerService.info('[ContextBuilderService] Assembling multi-dimensional composite context');
    
    const historySnippet = conversationHistory
      .slice(-5)
      .map(m => `${m.role || 'user'}: ${m.content || m.text || ''}`)
      .join('\n');

    const ragSnippet = ragDocs.map(d => d.content || d.text || '').join('\n');

    return {
      conversationSnippet: historySnippet,
      caseSnippet: caseContext,
      ragSnippet: ragSnippet,
      fullPromptContext: `[CONVERSATION]\n${historySnippet}\n\n[CASE CONTEXT]\n${caseContext}\n\n[KNOWLEDGE VAULT]\n${ragSnippet}`
    };
  }
}

export default ContextBuilderService;
