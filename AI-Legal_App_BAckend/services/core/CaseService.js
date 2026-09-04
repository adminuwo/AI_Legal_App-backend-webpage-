import mongoose from 'mongoose';
import Project from '../../models/Project.js';
import User from '../../models/User.js';
import BaseService from './base/BaseService.js';
import LoggerService from '../shared/LoggerService.js';
import CaseRepository from '../../repositories/CaseRepository.js';

/**
 * Enterprise CaseService Component
 * Encapsulates case management, readiness score calculation, and filter operations.
 */
export class CaseService extends BaseService {
  constructor() {
    super('CaseService');
    this.caseRepository = new CaseRepository();
  }


  isGarbageSummary(text) {
    if (!text) return true;
    const cleaned = text.trim().toLowerCase();
    if (cleaned.length < 15) return true;
    
    const garbagePatterns = [
      /abcdef/i, /12345/i, /qwerty/i, /asdfgh/i, /zxcvbn/i,
      /\b(abc|xyz|test|spam|garbage|placeholder|demo)\b/i
    ];
    for (const pattern of garbagePatterns) {
      if (pattern.test(cleaned)) return true;
    }
    return false;
  }

  calculateReadinessScore(project) {
    let score = 0;
    const missingFields = [];

    const summaryText = project.summary || project.caseSummary || '';
    const isSummaryValid = summaryText.trim().length >= 100 && !this.isGarbageSummary(summaryText);
    if (isSummaryValid) score += 25;
    else missingFields.push('Summary');

    const hasEvidence = project.evidence && project.evidence.length > 0;
    if (hasEvidence) score += 20;
    else missingFields.push('Evidence');

    const hasDocuments = (project.documents && project.documents.length > 0) || (project.drafts && project.drafts.length > 0);
    if (hasDocuments) score += 15;
    else missingFields.push('Documents');

    const hasTimeline = project.facts && project.facts.length > 0;
    if (hasTimeline) score += 10;
    else missingFields.push('Timeline');

    return { score, missingFields };
  }

  /**
   * List Cases for User with Pagination & Search Filters
   */
  async listUserCases(userId, query = {}) {
    if (mongoose.connection.readyState !== 1) {
      LoggerService.warn('[CaseService] DB unreachable. Returning demo cases.');
      return {
        statusCode: 200,
        data: {
          success: true,
          projects: [
            {
              _id: 'demo_case_1',
              title: 'Demo Legal Matter',
              caseNumber: 'DEMO-2026-001',
              status: 'Active',
              readinessScore: 70
            }
          ]
        }
      };
    }

    const { page = 1, limit = 20, search = '', status } = query;
    const filter = { userId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { caseNumber: new RegExp(search, 'i') },
        { court: new RegExp(search, 'i') }
      ];
    }

    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Project.countDocuments(filter);

    const enrichedProjects = projects.map(p => {
      const pObj = p.toObject();
      pObj.readiness = this.calculateReadinessScore(p);
      return pObj;
    });

    return {
      statusCode: 200,
      data: {
        success: true,
        projects: enrichedProjects,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      }
    };
  }

  /**
   * Get Details for Single Case
   */
  async getCaseDetails(caseId, userId) {
    if (mongoose.connection.readyState !== 1) {
      return {
        statusCode: 200,
        data: {
          success: true,
          project: {
            _id: caseId,
            title: 'Demo Legal Case',
            caseNumber: 'DEMO-101',
            status: 'Active'
          }
        }
      };
    }

    const project = await Project.findOne({ _id: caseId, userId });
    if (!project) {
      return { statusCode: 404, data: { success: false, error: 'Case not found' } };
    }

    const pObj = project.toObject();
    pObj.readiness = this.calculateReadinessScore(project);

    return { statusCode: 200, data: { success: true, project: pObj } };
  }
}

export default CaseService;
