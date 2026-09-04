import WorkspaceActivity from '../models/WorkspaceActivity.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import { getIO } from '../utils/socket.js';

/**
 * Centralized Service to log all Enterprise Law Firm Workspace Activities
 */
export const createWorkspaceActivity = async ({
  workspaceId,
  caseId = null,
  caseName = '',
  actorId,
  actorName = '',
  actorAvatar = '',
  actorRole = '',
  activityCategory,
  action,
  module,
  title,
  description = '',
  metadata = {},
  status = 'Completed',
}) => {
  try {
    if (!workspaceId || !actorId || !activityCategory || !action || !title) {
      console.warn('[ACTIVITY SERVICE WARNING] Missing required fields for activity logging', {
        workspaceId,
        actorId,
        activityCategory,
        action,
        title,
      });
    }

    // Resolve actor info if missing
    let finalActorName = actorName;
    let finalActorAvatar = actorAvatar;
    let finalActorRole = actorRole;

    if (actorId && (!finalActorName || !finalActorAvatar)) {
      const user = await User.findById(actorId).select('name fullName avatar role');
      if (user) {
        finalActorName = finalActorName || user.fullName || user.name || 'Advocate';
        finalActorAvatar = finalActorAvatar || user.avatar || '';
        finalActorRole = finalActorRole || user.role || 'Advocate';
      }
    }

    // Resolve case info if missing
    let finalCaseName = caseName;
    if (caseId && !finalCaseName) {
      const proj = await Project.findById(caseId).select('name');
      if (proj) {
        finalCaseName = proj.name;
      }
    }

    // Save to Database
    const activity = await WorkspaceActivity.create({
      workspaceId,
      caseId,
      caseName: finalCaseName,
      actorId,
      actorName: finalActorName || 'Advocate',
      actorAvatar: finalActorAvatar,
      actorRole: finalActorRole || 'Advocate',
      activityCategory,
      action,
      module,
      title,
      description,
      metadata,
      generatedContent: metadata.generatedContent || metadata.content || '',
      linkedDocumentId: metadata.linkedDocumentId || metadata.documentId || '',
      version: metadata.version || '1.0',
      status,
    });

    // Real-Time Socket Emission
    try {
      const io = getIO();
      if (io) {
        if (workspaceId) {
          io.to(`workspace_${workspaceId}`).emit('activity:new', activity);
        }
        if (caseId) {
          io.to(`case_${caseId}`).emit('activity:new', activity);
        }
      }
    } catch (socketErr) {
      // socket emission warning fallback
    }

    // Major Event Notification Trigger
    const majorEvents = [
      'Draft Uploaded',
      'Evidence Uploaded',
      'Task Assigned',
      'Hearing Scheduled',
      'Hearing Updated',
      'Client Message Sent',
    ];

    if (majorEvents.includes(action) && caseId) {
      const caseObj = await Project.findById(caseId);
      if (caseObj && caseObj.userId && caseObj.userId.toString() !== actorId.toString()) {
        await Notification.create({
          userId: caseObj.userId,
          title: `${action}: ${title}`,
          message: `${finalActorName} performed ${action} in case "${finalCaseName || caseObj.name}"`,
          type: 'workspace_activity',
          metadata: { activityId: activity._id, caseId, workspaceId },
        });
      }
    }

    return activity;
  } catch (err) {
    console.error('[ACTIVITY SERVICE ERROR] Failed to create workspace activity:', err);
    return null;
  }
};
