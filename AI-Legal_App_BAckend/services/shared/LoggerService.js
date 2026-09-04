import logger from '../../utils/logger.js';

/**
 * Enterprise Centralized Logger Service
 */
export class LoggerService {
  static info(message, meta = {}) {
    logger.info(message, meta);
  }

  static error(message, error = null) {
    logger.error(message, error ? error.stack || error.message : '');
  }

  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  static debug(message, meta = {}) {
    logger.debug ? logger.debug(message, meta) : logger.info(`[DEBUG] ${message}`, meta);
  }
}

export default LoggerService;
