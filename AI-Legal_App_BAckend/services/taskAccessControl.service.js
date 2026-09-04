import User from '../models/User.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import { AccessControlService } from './accessControl.service.js';

export class TaskAccessControlService {
  /**
   * Determine if an authenticated assigner is authorized to assign work to assigneeUserId.
   * Enforces Hierarchy: Firm Owner -> Senior Advocate -> Junior Advocate -> Intern.
   */
  static async canUserAssignTask(assignerUser, assigneeUserId, project) {
    if (!assignerUser || !assigneeUserId) return false;

    const assignerIdStr = String(assignerUser._id || assignerUser.id || '');
    const assigneeIdStr = String(assigneeUserId);

    // Self-assignment is always allowed
    if (assignerIdStr === assigneeIdStr) return true;

    const projectOwnerIdStr = String(project?.userId || '');
    const isOwner = assignerIdStr === projectOwnerIdStr || assignerUser.role === 'admin' || assignerUser.role === 'SUPER_ADMIN';

    if (isOwner) return true;

    // Resolve assigner and assignee firm roles
    const assignerIdentity = await AccessControlService.resolveUploaderIdentity(assignerIdStr, project);
    const assigneeIdentity = await AccessControlService.resolveUploaderIdentity(assigneeIdStr, project);

    const roleRank = {
      'Firm Owner': 4,
      'Senior Advocate': 3,
      'Junior Advocate': 2,
      'Advocate': 2,
      'Intern': 1,
      'Team Member': 1,
    };

    const assignerRank = roleRank[assignerIdentity.role] || 2;
    const assigneeRank = roleRank[assigneeIdentity.role] || 1;

    // High level role can delegate to equal or lower rank
    return assignerRank >= assigneeRank;
  }

  /**
   * Check if a user is authorized to view or access a specific Task.
   */
  static canUserAccessTask(user, project, task, isWorkspaceOwner = false) {
    if (!user || !task) return false;

    const userIdStr = String(user._id || user.id || '');
    const caseOwnerIdStr = String(project?.userId || '');
    const isOwner = isWorkspaceOwner || userIdStr === caseOwnerIdStr || user.role === 'admin' || user.role === 'SUPER_ADMIN';

    // Firm Owner, Case Lead, or Law Firm workspace members see all firm case tasks
    if (isOwner || project?.workspaceType === 'law_firm' || (project?.workspaceId && project.workspaceId !== 'personal_practice')) return true;

    const assignedToIdStr = typeof task.assignedTo === 'object'
      ? String(task.assignedTo?.userId || task.assignedTo?._id || '')
      : String(task.assignedTo || '');

    const assignedByIdStr = typeof task.assignedBy === 'object'
      ? String(task.assignedBy?.userId || task.assignedBy?._id || '')
      : String(task.assignedBy || '');

    // Direct User ID match
    if (userIdStr && (userIdStr === assignedToIdStr || userIdStr === assignedByIdStr)) return true;

    const assignedToName = typeof task.assignedTo === 'object' ? String(task.assignedTo?.name || '').trim().toLowerCase() : String(task.assignedTo || '').trim().toLowerCase();
    const assignedByName = typeof task.assignedBy === 'object' ? String(task.assignedBy?.name || '').trim().toLowerCase() : String(task.assignedBy || '').trim().toLowerCase();
    const currentUserName = String(user?.name || user?.fullName || '').trim().toLowerCase();
    const currentUserFirst = currentUserName.split(' ')[0];

    // Name-based match
    if (assignedToName && currentUserFirst && currentUserFirst.length >= 2) {
      if (assignedToName === currentUserName || assignedToName.includes(currentUserFirst) || currentUserFirst.includes(assignedToName)) {
        return true;
      }
    }

    if (assignedByName && currentUserFirst && currentUserFirst.length >= 2) {
      if (assignedByName === currentUserName || assignedByName.includes(currentUserFirst) || currentUserFirst.includes(assignedByName)) {
        return true;
      }
    }

    // Case Member Fallback: Allow case team members access to assigned tasks
    const isProjectMember = Boolean(
      (Array.isArray(project?.assignedMembers) && project.assignedMembers.some(id => String(id) === userIdStr)) ||
      (Array.isArray(project?.assignedUserIds) && project.assignedUserIds.some(id => String(id) === userIdStr)) ||
      (project?.leadAdvocateUserId && String(project.leadAdvocateUserId) === userIdStr)
    );

    if (isProjectMember) {
      if (!assignedToIdStr || assignedToName === 'team member' || assignedToName === 'advocate' || assignedToName === '') {
        return true;
      }
    }

    return false;
  }

  /**
   * Server-side task filtering to return ONLY tasks the user is authorized to see.
   */
  static async filterAndFormatTasks(user, project, tasks = [], isWorkspaceOwner = false) {
    if (!Array.isArray(tasks)) return [];

    const userIdStr = String(user._id || user.id || '');
    const caseOwnerIdStr = String(project?.userId || '');
    const isOwner = isWorkspaceOwner || userIdStr === caseOwnerIdStr || user.role === 'admin' || user.role === 'SUPER_ADMIN';

    const results = [];
    for (const task of tasks) {
      if (!this.canUserAccessTask(user, project, task, isOwner)) continue;

      const taskObj = task.toObject ? task.toObject() : { ...task };

      // Resolve real identities for assignedBy and assignedTo
      const assignedById = taskObj.assignedBy?.userId || (typeof taskObj.assignedBy === 'object' ? (taskObj.assignedBy?._id || taskObj.assignedBy?.id) : taskObj.assignedBy);
      if (assignedById) {
        const realBy = await AccessControlService.resolveUploaderIdentity(assignedById, project);
        taskObj.assignedBy = realBy;
      }

      const assignedToId = taskObj.assignedTo?.userId || (typeof taskObj.assignedTo === 'object' ? (taskObj.assignedTo?._id || taskObj.assignedTo?.id) : taskObj.assignedTo);
      if (assignedToId) {
        const realTo = await AccessControlService.resolveUploaderIdentity(assignedToId, project);
        taskObj.assignedTo = realTo;
      }

      // Compute Overdue status
      if (taskObj.dueDate && new Date(taskObj.dueDate).getTime() < Date.now() && taskObj.status !== 'Completed' && taskObj.status !== 'Closed') {
        taskObj.isOverdue = true;
      } else {
        taskObj.isOverdue = false;
      }

      results.push(taskObj);
    }

    return results;
  }
}
