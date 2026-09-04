import BaseRepository from './base/BaseRepository.js';
import Knowledge from '../models/Knowledge.model.js';

/**
 * KnowledgeRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class KnowledgeRepository extends BaseRepository {
  constructor() {
    super(Knowledge);
  }
}

export default KnowledgeRepository;
