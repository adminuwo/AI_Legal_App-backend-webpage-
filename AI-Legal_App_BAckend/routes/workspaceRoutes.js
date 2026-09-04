import express from 'express';
import { verifyToken } from '../middleware/authorization.js';
import {
    getWorkspaces,
    createWorkspace,
    inviteMember,
    getPendingInvitations,
    getWorkspacePendingInvitations,
    acceptInvitation,
    rejectInvitation,
    getWorkspaceMembers,
    updateMemberRoleAndPermissions,
    toggleMemberStatus,
    removeWorkspaceMember
} from '../controllers/workspaceController.js';

const router = express.Router();

router.get('/', verifyToken, getWorkspaces);
router.post('/', verifyToken, createWorkspace);
router.get('/invitations/pending', verifyToken, getPendingInvitations);
router.post('/invitations/:invitationId/accept', verifyToken, acceptInvitation);
router.post('/invitations/:invitationId/reject', verifyToken, rejectInvitation);
router.get('/:workspaceId/members', verifyToken, getWorkspaceMembers);
router.get('/:workspaceId/invitations/pending', verifyToken, getWorkspacePendingInvitations);
router.get('/:workspaceId/invitations', verifyToken, getWorkspacePendingInvitations);
router.post('/:workspaceId/invitations', verifyToken, inviteMember);
router.put('/:workspaceId/members/:memberId/role', verifyToken, updateMemberRoleAndPermissions);
router.put('/:workspaceId/members/:memberId/status', verifyToken, toggleMemberStatus);
router.post('/:workspaceId/members/:memberId/remove', verifyToken, removeWorkspaceMember);

export default router;
