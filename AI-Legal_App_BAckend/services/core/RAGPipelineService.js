import BaseService from './base/BaseService.js';
import KnowledgeVaultService from './KnowledgeVaultService.js';
import ContextBuilderService from './ContextBuilderService.js';
import LoggerService from '../shared/LoggerService.js';

/**
 * Enterprise RAGPipelineService Component
 * Encapsulates end-to-end RAG pipeline orchestration.
 */
export class RAGPipelineService extends BaseService {
  constructor() {
    super('RAGPipelineService');
    this.knowledgeVault = new KnowledgeVaultService();
    this.contextBuilder = new ContextBuilderService();
  }

  /**
   * Execute End-to-End RAG Pipeline
   */
  async executePipeline(userQuery, category = null, conversationHistory = []) {
    LoggerService.info(`[RAGPipelineService] Executing RAG pipeline for query: ${userQuery}`);
    
    const vaultResult = await this.knowledgeVault.retrieveKnowledge(category, userQuery);
    const ragDocs = vaultResult.data?.documents || [];

    const context = await this.contextBuilder.buildCompositeContext(conversationHistory, '', ragDocs);

    return {
      statusCode: 200,
      data: {
        success: true,
        query: userQuery,
        contextPayload: context.fullPromptContext,
        citations: vaultResult.data?.citations || []
      }
    };
  }
}

export default RAGPipelineService;
