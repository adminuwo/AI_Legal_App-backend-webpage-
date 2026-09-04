import BaseRepository from './base/BaseRepository.js';
import Project from '../models/Project.js';

/**
 * CaseRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class CaseRepository extends BaseRepository {
  constructor() {
    super(Project);
  }

  async findUserProjects(userId, page = 1, limit = 10) {
    return this.paginate({ userId }, page, limit);
  }
}

export default CaseRepository;
