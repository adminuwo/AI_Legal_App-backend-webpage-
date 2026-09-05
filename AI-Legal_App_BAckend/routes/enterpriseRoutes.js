import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import {
  setupEnterprise,
  getEnterpriseDetails,
  updateDomain,
  verifyDomainAutoLink,
  getStudents,
  inviteStudent,
  bulkImportStudents,
  getFaculty,
  addFaculty,
  getAcademicTree,
  updateAcademicTree,
  getCurriculumContextForStudent,
  getFeaturePolicies,
  updateFeaturePolicies,
  getUsageAndCredits,
  updateUsageAndCredits,
  getAnalytics,
  getAnnouncements,
  createAnnouncement,
  getAddons,
  requestAddon,
  generateReport,
  getOrganizationsList
} from '../controllers/enterpriseController.js';

const router = express.Router();

// Organizations (Fetch ONLY organizationId, organizationName, and email)
router.get('/organizations', verifyToken, getOrganizationsList);
router.get('/organizations/list', getOrganizationsList);

// Onboarding & Setup
router.post('/setup', verifyToken, setupEnterprise);
router.get('/details', verifyToken, getEnterpriseDetails);

// Domain & Auto-linking
router.post('/domain', verifyToken, updateDomain);
router.post('/domain/auto-link', verifyToken, verifyDomainAutoLink);

// Students Management
router.get('/students', verifyToken, getStudents);
router.post('/students/invite', verifyToken, inviteStudent);
router.post('/students/bulk-import', verifyToken, bulkImportStudents);

// Faculty Management
router.get('/faculty', verifyToken, getFaculty);
router.post('/faculty/add', verifyToken, addFaculty);

// Academic Structure & Curriculum
router.get('/academic', verifyToken, getAcademicTree);
router.post('/academic/update', verifyToken, updateAcademicTree);
router.get('/curriculum/context', verifyToken, getCurriculumContextForStudent);

// Feature Access & Quotas
router.get('/features', verifyToken, getFeaturePolicies);
router.post('/features/update', verifyToken, updateFeaturePolicies);

// Usage & Budget
router.get('/usage-credits', verifyToken, getUsageAndCredits);
router.post('/usage-credits/update', verifyToken, updateUsageAndCredits);

// Analytics
router.get('/analytics', verifyToken, getAnalytics);

// Announcements
router.get('/announcements', verifyToken, getAnnouncements);
router.post('/announcements/create', verifyToken, createAnnouncement);

// Add-ons
router.get('/addons', verifyToken, getAddons);
router.post('/addons/request', verifyToken, requestAddon);

// Reports
router.post('/reports/generate', verifyToken, generateReport);

export default router;
