import BaseRepository from './base/BaseRepository.js';
import User from '../models/User.js';

/**
 * UserRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    if (!email) return null;
    return this.findOne({ email: email.toLowerCase().trim() });
  }
}

export default UserRepository;
