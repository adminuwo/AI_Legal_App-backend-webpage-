import mongoose from 'mongoose';
import WorkspaceActivity from '../models/WorkspaceActivity.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

export class CaseActivityService {
  /**
   * Records a persistent, case-bound activity entry for authorized actions.
   */
  static async recordCaseActivity({
    workspaceId,
    caseId,
    actorUserId,
    module,
    activityCategory,
    action,
    title,
    description,
    relatedEntityType,
    relatedEntityId,
    metadata = {}
  }) {
    try {
      if (!workspaceId || !caseId || !actorUserId) {
        console.warn('[CaseActivityService] Skipping recording: missing workspaceId, caseId, or actorUserId');
        return null;
      }

      // Resolve Actor Details
      let actorName = 'Advocate';
      let actorRole = 'Advocate';
      let actorAvatar = '';

      if (actorUserId) {
        const user = await User.findById(actorUserId).select('fullName name role avatar profilePicture').lean();
        if (user) {
          actorName = user.fullName || user.name || 'Advocate';
          actorRole = user.role || 'Advocate';
          actorAvatar = user.avatar || user.profilePicture || '';
        }
      }

      // Resolve Case Name
      let caseNameStr = metadata.caseName || '';
      if (!caseNameStr && caseId) {
        const project = await Project.findById(caseId).select('name').lean();
        if (project) caseNameStr = project.name;
      }

      const wsIdObj = mongoose.Types.ObjectId.isValid(String(workspaceId))
        ? new mongoose.Types.ObjectId(String(workspaceId))
        : String(workspaceId);

      const caseIdObj = mongoose.Types.ObjectId.isValid(String(caseId))
        ? new mongoose.Types.ObjectId(String(caseId))
        : String(caseId);

      const actorIdObj = mongoose.Types.ObjectId.isValid(String(actorUserId))
        ? new mongoose.Types.ObjectId(String(actorUserId))
        : String(actorUserId);

      const activity = new WorkspaceActivity({
        workspaceId: wsIdObj,
        caseId: caseIdObj,
        caseName: caseNameStr,
        actorId: actorIdObj,
        actorName,
        actorAvatar,
        actorRole,
        module: module || activityCategory || 'case_management',
        activityCategory: activityCategory || module || 'case_management',
        action: action || 'UPDATED',
        title: title || 'Case Update',
        description: description || '',
        relatedEntityType: relatedEntityType || '',
        relatedEntityId: relatedEntityId ? String(relatedEntityId) : '',
        metadata,
        status: 'Completed',
        readBy: [actorIdObj] // Actor automatically reads their own action
      });

      await activity.save();
      return activity;
    } catch (error) {
      console.error('[CaseActivityService.recordCaseActivity Error]:', error);
      return null;
    }
  }
}

export default CaseActivityService;
