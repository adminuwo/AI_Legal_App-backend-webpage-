import BaseService from './base/BaseService.js';
import serviceError from './helpers/serviceError.js';
import serviceResult from './helpers/serviceResult.js';

import AuthService from './AuthService.js';
import UserService from './UserService.js';
import CaseService from './CaseService.js';
import AIService from './AIService.js';
import DocumentService from './DocumentService.js';
import EvidenceService from './EvidenceService.js';
import KnowledgeService from './KnowledgeService.js';
import ResearchService from './ResearchService.js';
import PaymentService from './PaymentService.js';
import NotificationService from './NotificationService.js';

export {
  BaseService,
  serviceError,
  serviceResult,
  AuthService,
  UserService,
  CaseService,
  AIService,
  DocumentService,
  EvidenceService,
  KnowledgeService,
  ResearchService,
  PaymentService,
  NotificationService
};

export default {
  BaseService,
  serviceError,
  serviceResult
};
