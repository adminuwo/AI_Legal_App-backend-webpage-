import BaseRepository from './base/BaseRepository.js';
import Payment from '../models/Payment.js';

/**
 * PaymentRepository Skeleton
 * Standalone repository module extending BaseRepository.
 */
export class PaymentRepository extends BaseRepository {
  constructor() {
    super(Payment);
  }
}

export default PaymentRepository;
