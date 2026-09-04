import BaseService from './base/BaseService.js';
import Project from '../../models/Project.js';
import CaseRepository from '../../repositories/CaseRepository.js';

/**
 * Enterprise LegalWorkspaceService Component
 * Encapsulates workspace summary, timeline event aggregation, and statistics.
 */
export class LegalWorkspaceService extends BaseService {
  constructor() {
    super('LegalWorkspaceService');
    this.caseRepository = new CaseRepository();
  }


  /**
   * Fetch Workspace Overview Statistics & Timeline
   */
  async getWorkspaceOverview(caseId, userId) {
    const project = await Project.findOne({ _id: caseId, userId });
    if (!project) {
      return { statusCode: 404, data: { success: false, error: 'Case workspace not found' } };
    }

    const factsCount = project.facts ? project.facts.length : 0;
    const evidenceCount = project.evidence ? project.evidence.length : 0;
    const documentsCount = project.documents ? project.documents.length : 0;
    const draftsCount = project.drafts ? project.drafts.length : 0;

    return {
      statusCode: 200,
      data: {
        success: true,
        overview: {
          caseId: project._id,
          title: project.title,
          status: project.status,
          court: project.court,
          judge: project.judge,
          nextHearingDate: project.nextHearingDate,
          statistics: {
            factsCount,
            evidenceCount,
            documentsCount,
            draftsCount
          }
        }
      }
    };
  }
}

export default LegalWorkspaceService;
