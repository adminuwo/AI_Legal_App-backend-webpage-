import BaseRepository from './base/BaseRepository.js';
import Precedent from '../models/Precedent.js';

/**
 * ResearchRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class ResearchRepository extends BaseRepository {
  constructor() {
    super(Precedent);
  }
}

export default ResearchRepository;
