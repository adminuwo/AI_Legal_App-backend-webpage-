import mongoose from 'mongoose';
import User from '../models/User.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';

export class AccessControlService {
    /**
     * Dynamically resolve authenticated uploader identity (name & firm role) from database.
     */
    static async resolveUploaderIdentity(userId, project) {
        if (!userId) {
            return { userId: '', name: 'Uploader information unavailable', role: '' };
        }

        try {
            let userDoc = null;
            let canonicalUserIdStr = String(userId);

            if (mongoose.Types.ObjectId.isValid(userId)) {
                userDoc = await User.findById(userId).lean();
            }

            // If userId is a WorkspaceMembership ID instead of User ID, resolve via Membership
            if (!userDoc && mongoose.Types.ObjectId.isValid(userId)) {
                const membershipDoc = await WorkspaceMembership.findById(userId).lean();
                if (membershipDoc && membershipDoc.userId) {
                    canonicalUserIdStr = String(membershipDoc.userId);
                    userDoc = await User.findById(membershipDoc.userId).lean();
                }
            }

            // If userDoc is still null, attempt case/workspace membership resolution or name lookup
            if (!userDoc && typeof userId === 'string' && userId.trim()) {
                userDoc = await User.findOne({
                    $or: [
                        { name: new RegExp(`^${userId.trim()}$`, 'i') },
                        { fullName: new RegExp(`^${userId.trim()}$`, 'i') }
                    ]
                }).lean();

                if (userDoc) {
                    canonicalUserIdStr = String(userDoc._id);
                }
            }

            if (!userDoc && project?.workspaceId) {
                const memberships = await WorkspaceMembership.find({ workspaceId: project.workspaceId }).lean();
                for (const mem of memberships) {
                    if (String(mem._id) === String(userId) || String(mem.userId) === String(userId)) {
                        canonicalUserIdStr = String(mem.userId);
                        userDoc = await User.findById(mem.userId).lean();
                        break;
                    }
                }
            }

            const userName = userDoc?.name || userDoc?.fullName || 'Advocate';

            const projectOwnerIdStr = String(project?.userId || '');
            let userRole = 'Senior Advocate';

            if (canonicalUserIdStr === projectOwnerIdStr || userDoc?.role === 'admin' || userDoc?.role === 'SUPER_ADMIN') {
                userRole = 'Firm Owner';
            } else if (project?.workspaceId) {
                const membership = await WorkspaceMembership.findOne({
                    workspaceId: project.workspaceId,
                    userId: canonicalUserIdStr
                }).lean();

                if (membership && membership.role) {
                    if (membership.role === 'Advocate / Owner' || membership.role === 'Managing Partner') {
                        userRole = 'Firm Owner';
                    } else {
                        userRole = membership.role;
                    }
                } else if (userDoc?.role) {
                    userRole = userDoc.role === 'lawyer' ? 'Senior Advocate' : userDoc.role;
                }
            }

            return {
                userId: canonicalUserIdStr,
                name: userName,
                role: userRole
            };
        } catch (err) {
            console.warn('[IDENTITY RESOLVE ERROR]', err.message);
            return {
                userId: String(userId),
                name: 'Advocate',
                role: ''
            };
        }
    }

    /**
     * Determine if a user has basic visibility access to a Document or Evidence item.
     * @param {Object} user - Authenticated user object ({ id, name, role })
     * @param {Object} project - Case / Project document
     * @param {Object} item - Document or Evidence item
     * @param {Boolean} isWorkspaceOwner - True if user is owner of the law firm workspace or case lead
     */
    static canUserAccessItem(user, project, item, isWorkspaceOwner = false) {
        if (!user || !item) return false;
        
        const userIdStr = String(user._id || user.id || '');
        const uploaderIdStr = String(item.uploadedBy?.userId || item.uploadedBy || '');
        const caseOwnerIdStr = String(project?.userId || '');

        // 1. Direct Uploader or Case/Firm Owner always has access (Owner Administrative Override)
        if (userIdStr === uploaderIdStr || userIdStr === caseOwnerIdStr || isWorkspaceOwner) {
            return true;
        }

        // Default visibility to TEAM if undefined for backward compatibility
        const visibility = item.visibility || 'TEAM';

        switch (visibility) {
            case 'TEAM':
                // Visible to all authorized case members
                return true;

            case 'OWNER_ONLY':
                // Only uploader and firm/case owner (handled above for owner, so false here for regular members)
                return false;

            case 'SELECTED':
                // Check if user is in sharedWith list
                if (Array.isArray(item.sharedWith)) {
                    return item.sharedWith.some(member => String(member.userId) === userIdStr);
                }
                return false;

            case 'PRIVATE':
                // Strictly uploader (and owner override handled above)
                return false;

            default:
                return true;
        }
    }

    /**
     * Compute current user's effective permissions on an item.
     * @param {Object} user - Authenticated user object
     * @param {Object} project - Case / Project document
     * @param {Object} item - Document or Evidence item
     * @param {Boolean} isWorkspaceOwner - True if user is workspace owner or lead advocate
     */
    static getUserItemPermissions(user, project, item, isWorkspaceOwner = false) {
        const userIdStr = String(user._id || user.id || '');
        const uploaderIdStr = String(item.uploadedBy?.userId || item.uploadedBy || '');
        const caseOwnerIdStr = String(project?.userId || '');

        // Uploader, Case Owner, or Firm Owner gets full rights by default
        if (userIdStr === uploaderIdStr || userIdStr === caseOwnerIdStr || isWorkspaceOwner) {
            return {
                canView: true,
                canDownload: true,
                canComment: true,
                canReview: true,
                canEdit: true,
                canApprove: true,
                canReject: true,
                canManagePermissions: true
            };
        }

        // If user cannot access item at all, return all false
        if (!this.canUserAccessItem(user, project, item, isWorkspaceOwner)) {
            return {
                canView: false,
                canDownload: false,
                canComment: false,
                canReview: false,
                canEdit: false,
                canApprove: false,
                canReject: false,
                canManagePermissions: false
            };
        }

        // Check if explicit per-user permissions exist in sharedWith array
        if (Array.isArray(item.sharedWith)) {
            const userShare = item.sharedWith.find(m => String(m.userId) === userIdStr);
            if (userShare && userShare.permissions) {
                const p = userShare.permissions;
                return {
                    canView: p.view ?? true,
                    canDownload: p.download ?? false,
                    canComment: p.comment ?? p.review ?? false,
                    canReview: p.review ?? p.comment ?? false,
                    canEdit: p.edit ?? false,
                    canApprove: p.approve ?? false,
                    canReject: p.reject ?? false,
                    canManagePermissions: false
                };
            }
        }

        // Fallback to item's default permissions or legacy defaults
        const dp = item.defaultPermissions || {};
        return {
            canView: dp.view ?? true,
            canDownload: dp.download ?? true,
            canComment: dp.comment ?? dp.review ?? true,
            canReview: dp.review ?? dp.comment ?? true,
            canEdit: dp.edit ?? false,
            canApprove: dp.approve ?? false,
            canReject: dp.reject ?? false,
            canManagePermissions: false
        };
    }

    /**
     * Filters an array of Documents or Evidence items server-side to return only those accessible by the user,
     * attaching computed user permissions to each item.
     */
    static async filterAndFormatItems(user, project, items = [], isWorkspaceOwner = false) {
        if (!Array.isArray(items)) return [];

        const userIdStr = String(user._id || user.id || '');
        const caseOwnerIdStr = String(project?.userId || '');
        const isOwner = isWorkspaceOwner || userIdStr === caseOwnerIdStr || user.role === 'admin' || user.role === 'SUPER_ADMIN';

        const results = [];
        for (const item of items) {
            if (!this.canUserAccessItem(user, project, item, isOwner)) continue;

            const itemObj = item.toObject ? item.toObject() : { ...item };
            const userPermissions = this.getUserItemPermissions(user, project, item, isOwner);

            // Auto-heal / resolve uploader identity if userId exists or if uploadedBy is missing/generic
            let uId = itemObj.uploadedBy?.userId || itemObj.uploadedById || itemObj.uploaderId;
            if (!uId && typeof itemObj.uploadedBy === 'string' && itemObj.uploadedBy.length === 24) {
                uId = itemObj.uploadedBy;
            }

            if (uId) {
                const realUploader = await this.resolveUploaderIdentity(uId, project);
                itemObj.uploadedBy = realUploader;
            } else if (typeof itemObj.uploadedBy === 'string') {
                if (itemObj.uploadedBy === 'Advocate' || itemObj.uploadedBy === 'Firm Owner') {
                    const realUploader = await this.resolveUploaderIdentity(project.userId, project);
                    itemObj.uploadedBy = realUploader;
                } else {
                    itemObj.uploadedBy = {
                        name: itemObj.uploadedBy,
                        role: ''
                    };
                }
            } else if (!itemObj.uploadedBy || !itemObj.uploadedBy.name || itemObj.uploadedBy.name === 'Advocate') {
                const realUploader = await this.resolveUploaderIdentity(project.userId, project);
                itemObj.uploadedBy = realUploader;
            }

            // Also format sharedWith items with real names & roles if userId exists
            if (Array.isArray(itemObj.sharedWith)) {
                const formattedSharedWith = [];
                for (const sw of itemObj.sharedWith) {
                    const sId = sw.userId || sw._id || sw.id;
                    if (sId) {
                        const realMember = await this.resolveUploaderIdentity(sId, project);
                        formattedSharedWith.push({
                            userId: String(sId),
                            name: realMember.name,
                            role: realMember.role,
                            permissions: sw.permissions || sw
                        });
                    } else {
                        formattedSharedWith.push(sw);
                    }
                }
                itemObj.sharedWith = formattedSharedWith;
            }

            results.push({
                ...itemObj,
                currentUserPermissions: userPermissions,
                userAccessBadge: this.getAccessBadgeLabel(userPermissions)
            });
        }

        return results;
    }

    static getAccessBadgeLabel(permissions) {
        if (permissions.canManagePermissions || (permissions.canEdit && permissions.canApprove)) return 'Full Access';
        if (permissions.canApprove || permissions.canReject) return 'Reviewer / Approver';
        if (permissions.canEdit) return 'Editor';
        if (permissions.canReview || permissions.canComment) return 'Review Only';
        if (permissions.canView) return 'View Only';
        return 'No Access';
    }
}

export default AccessControlService;
