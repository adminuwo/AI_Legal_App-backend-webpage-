import BaseService from './base/BaseService.js';
import Knowledge from '../../models/Knowledge.model.js';
import LoggerService from '../shared/LoggerService.js';
import KnowledgeRepository from '../../repositories/KnowledgeRepository.js';

/**
 * Enterprise KnowledgeVaultService Component
 * Encapsulates legal knowledge retrieval, vector document lookup, and metadata citation assembly.
 */
export class KnowledgeVaultService extends BaseService {
  constructor() {
    super('KnowledgeVaultService');
    this.knowledgeRepository = new KnowledgeRepository();
  }


  /**
   * Lookup Knowledge Base Documents by Category or Search Term
   */
  async retrieveKnowledge(category, searchTerm = '') {
    LoggerService.info(`[KnowledgeVaultService] Retrieving knowledge for category: ${category}`);
    const filter = {};
    if (category) filter.category = category;
    if (searchTerm) filter.$text = { $search: searchTerm };

    const docs = await Knowledge.find(filter).limit(20);
    return {
      statusCode: 200,
      data: {
        success: true,
        documents: docs,
        citations: docs.map(d => d.filename || d.title)
      }
    };
  }
}

export default KnowledgeVaultService;
