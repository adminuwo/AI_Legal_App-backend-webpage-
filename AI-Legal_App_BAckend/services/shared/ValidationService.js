import helpers from '../../validators/helpers.js';

/**
 * Enterprise Shared Validation Service
 */
export class ValidationService {
  static validateEmail(email) {
    return helpers.isEmail(email);
  }

  static validatePhone(phone) {
    return helpers.isPhone(phone);
  }

  static validateMongoId(id) {
    return helpers.isMongoId(id);
  }

  static validateString(str) {
    return helpers.isString(str);
  }
}

export default ValidationService;
