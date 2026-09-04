import validate from './validate.middleware.js';
import formatValidationError from './error.formatter.js';
import helpers from './helpers.js';

import authSchemas from './schemas/auth.schema.js';
import caseSchemas from './schemas/case.schema.js';
import documentSchemas from './schemas/document.schema.js';
import userSchemas from './schemas/user.schema.js';
import contractSchemas from './schemas/contract.schema.js';
import knowledgeSchemas from './schemas/knowledge.schema.js';
import researchSchemas from './schemas/research.schema.js';
import paymentSchemas from './schemas/payment.schema.js';
import notificationSchemas from './schemas/notification.schema.js';

export {
  validate,
  formatValidationError,
  helpers,
  authSchemas,
  caseSchemas,
  documentSchemas,
  userSchemas,
  contractSchemas,
  knowledgeSchemas,
  researchSchemas,
  paymentSchemas,
  notificationSchemas
};

export default {
  validate,
  formatValidationError,
  helpers
};
