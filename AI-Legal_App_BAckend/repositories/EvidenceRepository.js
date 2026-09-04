import BaseRepository from './base/BaseRepository.js';
import Analysis from '../models/Analysis.js';

/**
 * EvidenceRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class EvidenceRepository extends BaseRepository {
  constructor() {
    super(Analysis);
  }
}

export default EvidenceRepository;
