import mongoose from 'mongoose';
import { withTransaction } from '../../repositories/helpers/query.helper.js';

/**
 * Enterprise Transaction Manager Service
 */
export class TransactionService {
  static async executeTransaction(operation) {
    const session = await mongoose.startSession();
    try {
      return await withTransaction(session, operation);
    } catch (err) {
      throw err;
    }
  }
}

export default TransactionService;
