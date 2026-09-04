import BaseRepository from './base/BaseRepository.js';
import UploadAsset from '../models/UploadAsset.js';

/**
 * DocumentRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class DocumentRepository extends BaseRepository {
  constructor() {
    super(UploadAsset);
  }
}

export default DocumentRepository;
