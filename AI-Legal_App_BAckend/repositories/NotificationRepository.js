import BaseRepository from './base/BaseRepository.js';
import Notification from '../models/Notification.js';

/**
 * NotificationRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }
}

export default NotificationRepository;
