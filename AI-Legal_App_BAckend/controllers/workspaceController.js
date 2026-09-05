import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import WorkspaceInvitation from '../models/WorkspaceInvitation.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { createNotification } from '../services/notificationService.js';
import crypto from 'crypto';
import { InvitationDeliveryService } from '../services/invitationDeliveryService.js';

// In-memory fallback storage for when MongoDB is down
const fallbackWorkspaces = [
    {
        _id: 'personal_practice',
        id: 'personal_practice',
        name: 'Personal Practice',
        type: 'personal',
        ownerId: 'demo_owner_id',
        badge: 'Personal',
        icon: 'person-outline',
        casesCount: 14,
        membersCount: 1
    },
    {
        _id: 'firm_abc_workspace',
        id: 'firm_abc_workspace',
        name: 'ABC Law Associates',
        type: 'law_firm',
        ownerId: 'demo_owner_id',
        badge: 'Law Firm',
        icon: 'business-outline',
        casesCount: 8,
        membersCount: 12
    }
];

const fallbackMemberships = [
    {
        _id: 'm_personal',
        workspaceId: 'personal_practice',
        userId: 'demo_owner_id',
        role: 'Advocate / Owner',
        department: 'General Practice',
        permission: 'Administrator',
        modules: ['Dashboard', 'Cases', 'Documents']
    },
    {
        _id: 'm_firm',
        workspaceId: 'firm_abc_workspace',
        userId: 'demo_owner_id',
        role: 'Managing Partner',
        department: 'Corporate Law',
        permission: 'Administrator',
        modules: ['Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks']
    }
];

const fallbackInvitations = [];

export const getWorkspaces = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        if (mongoose.connection.readyState !== 1) {
            console.log('[WORKSPACE CONTROLLER] DB Down. Returning in-memory workspaces.');
            // Add user's ID to local workspaces fallback
            const userFallbackWorkspaces = fallbackWorkspaces.map(w => ({ ...w, ownerId: userId }));
            return res.json({ success: true, workspaces: userFallbackWorkspaces });
        }

        // 1. Always ensure there is a personal practice workspace for the user
        let personalWorkspace = await Workspace.findOne({ ownerId: userId, type: 'personal' });
        if (!personalWorkspace) {
            personalWorkspace = await Workspace.create({
                name: 'Personal Practice',
                type: 'personal',
                ownerId: userId,
                badge: 'Personal',
                icon: 'person-outline',
                casesCount: await Project.countDocuments({ userId, workspaceId: { $in: [null, '', 'personal_practice'] } }),
                membersCount: 1
            });

            await WorkspaceMembership.create({
                workspaceId: personalWorkspace._id,
                userId: userId,
                role: 'Advocate / Owner',
                department: 'General Practice',
                permission: 'Administrator',
                modules: ['Firm Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks', 'Hearings', 'Calendar', 'Research', 'AI Assistant']
            });
        }

        // 2. Fetch memberships
        const memberships = await WorkspaceMembership.find({ userId }).populate('workspaceId');
        
        const workspaces = [];
        for (const membership of memberships) {
            if (membership.workspaceId) {
                const ws = membership.workspaceId.toObject();
                // Map fields to match mobile expectations
                ws.id = ws.type === 'personal' ? 'personal_practice' : ws._id.toString();
                ws.role = membership.role;
                ws.department = membership.department;
                ws.permission = membership.permission;
                ws.modules = membership.modules;
                
                // Dynamically count cases
                ws.casesCount = await Project.countDocuments({ workspaceId: ws._id.toString() });
                
                workspaces.push(ws);
            }
        }

        res.json({ success: true, workspaces });
    } catch (error) {
        console.error('[GET WORKSPACES ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to fetch workspaces' });
    }
};

export const createWorkspace = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Workspace name is required' });
        }

        if (mongoose.connection.readyState !== 1) {
            console.log('[WORKSPACE CONTROLLER] DB Down. Simulating workspace creation.');
            const newWs = {
                _id: `ws_${Date.now()}`,
                id: `ws_${Date.now()}`,
                name,
                type: 'law_firm',
                ownerId: userId,
                badge: 'Law Firm',
                icon: 'business-outline',
                casesCount: 0,
                membersCount: 1,
                role: 'Managing Partner',
                permission: 'Administrator'
            };
            fallbackWorkspaces.push(newWs);
            fallbackMemberships.push({
                _id: `m_${Date.now()}`,
                workspaceId: newWs.id,
                userId: userId,
                role: 'Managing Partner',
                permission: 'Administrator',
                modules: ['Firm Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks']
            });
            return res.status(201).json({ success: true, workspace: newWs });
        }

        const newWorkspace = await Workspace.create({
            name,
            type: 'law_firm',
            ownerId: userId,
            badge: 'Law Firm',
            icon: 'business-outline',
            casesCount: 0,
            membersCount: 1
        });

        await WorkspaceMembership.create({
            workspaceId: newWorkspace._id,
            userId: userId,
            role: 'Managing Partner',
            department: 'Corporate Law',
            permission: 'Administrator',
            modules: ['Firm Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks', 'Hearings', 'Calendar', 'Research', 'AI Assistant', 'Reports', 'Billing', 'Client CRM']
        });

        const wsObj = newWorkspace.toObject();
        wsObj.id = wsObj._id.toString();
        wsObj.role = 'Managing Partner';
        wsObj.permission = 'Administrator';

        res.status(201).json({ success: true, workspace: wsObj });
    } catch (error) {
        console.error('[CREATE WORKSPACE ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to create workspace' });
    }
};

export const inviteMember = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { workspaceId } = req.params;
        const inviteData = req.body;

        if (!inviteData.fullName || (!inviteData.email && !inviteData.mobile)) {
            return res.status(400).json({ success: false, error: 'Full Name and either Email or Mobile are required' });
        }

        const deliveryResult = await InvitationDeliveryService.deliver({
            workspaceId,
            inviterId: userId,
            fullName: inviteData.fullName,
            email: inviteData.email,
            mobile: inviteData.mobile,
            role: inviteData.role,
            department: inviteData.department,
            permission: inviteData.permission,
            modules: inviteData.modules,
            personalMessage: inviteData.personalMessage,
            barCouncilNo: inviteData.barCouncilNo,
            stateBarCouncil: inviteData.stateBarCouncil
        });

        // Store in fallback memory storage if mock flow runs
        if (mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(workspaceId)) {
            fallbackInvitations.push(deliveryResult.invitation);
        }

        res.status(201).json({
            success: true,
            invitation: deliveryResult.invitation,
            recipientAccountExists: deliveryResult.recipientAccountExists,
            channelsDelivered: deliveryResult.channelsDelivered
        });
    } catch (error) {
        console.error('[INVITE TEAM MEMBER ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to send invitation' });
    }
};

export const getPendingInvitations = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        if (mongoose.connection.readyState !== 1) {
            console.log('[WORKSPACE CONTROLLER] DB Down. Returning fallback pending invitations for recipient.');
            return res.json({ success: true, invitations: fallbackInvitations.filter(i => i.status === 'Pending') });
        }

        const user = await User.findById(userId);
        
        let invitations = [];
        if (user) {
            const userEmail = user.email ? user.email.toLowerCase().trim() : '';
            const userPhone = user.phone || user.mobile || '';

            const conditions = [];
            if (userEmail) {
                const safeEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                conditions.push({ email: new RegExp('^' + safeEmail + '$', 'i') });
            }
            if (userPhone) {
                conditions.push({ mobile: userPhone }, { phone: userPhone });
            }

            if (conditions.length > 0) {
                invitations = await WorkspaceInvitation.find({
                    $or: conditions,
                    status: 'Pending'
                }).populate('workspaceId').populate('inviterId', 'name fullName email');
            }
        }

        // If DB query returned no results or user is in memory/fallback list, check fallbackInvitations as well
        if (invitations.length === 0 && fallbackInvitations.length > 0) {
            const pendingFallback = fallbackInvitations.filter(i => i.status === 'Pending');
            if (pendingFallback.length > 0) {
                invitations = pendingFallback;
            }
        }

        console.log(`[GET PENDING INVITATIONS] Found ${invitations.length} pending invitations for user: ${userId}`);

        res.json({ success: true, invitations });
    } catch (error) {
        console.error('[GET PENDING INVITATIONS ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to get invitations' });
    }
};

/**
 * LAW FIRM / SENDER VIEW: Fetch all pending invitations created for a specific Law Firm Workspace.
 */
export const getWorkspacePendingInvitations = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        console.log(`[INVITE] Fetching workspace pending invitations for workspaceId: ${workspaceId}`);

        const isMockOrDbDown = mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(workspaceId);

        if (isMockOrDbDown) {
            console.log(`[WORKSPACE CONTROLLER] DB Down or Mock ID. Returning fallback pending invitations for workspace: ${workspaceId}`);
            const pending = fallbackInvitations.filter(i =>
                (i.workspaceId === workspaceId || i.workspaceId?.toString() === workspaceId) &&
                i.status === 'Pending'
            );
            console.log(`[INVITE] Pending invitation count: ${pending.length}`);
            return res.json({ success: true, invitations: pending });
        }

        const wsObjId = mongoose.Types.ObjectId.isValid(workspaceId) ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;

        const invitations = await WorkspaceInvitation.find({
            $or: [
                { workspaceId: wsObjId },
                { workspaceId: workspaceId }
            ],
            status: 'Pending'
        }).populate('inviterId', 'name fullName email');

        console.log(`[INVITE] Pending invitation count: ${invitations.length}`);

        res.json({ success: true, invitations });
    } catch (error) {
        console.error('[GET WORKSPACE PENDING INVITATIONS ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to get workspace pending invitations' });
    }
};

export const acceptInvitation = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { invitationId } = req.params;

        const isMockOrDbDown = mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(invitationId);
        if (isMockOrDbDown) {
            console.log('[WORKSPACE CONTROLLER] DB Down or Mock ID. Simulating invitation acceptance.');
            const idx = fallbackInvitations.findIndex(i => i._id === invitationId);
            if (idx === -1) {
                return res.json({ success: true, message: 'Invitation accepted successfully' });
            }
            fallbackInvitations[idx].status = 'Accepted';
            
            const wsId = fallbackInvitations[idx].workspaceId;
            const firmWs = {
                _id: wsId,
                id: wsId,
                name: 'ABC Law Associates',
                type: 'law_firm',
                ownerId: 'other_owner_id',
                badge: 'Law Firm',
                icon: 'business-outline',
                casesCount: 8,
                membersCount: 13,
                role: fallbackInvitations[idx].role,
                permission: fallbackInvitations[idx].permission
            };
            
            fallbackWorkspaces.push(firmWs);
            fallbackMemberships.push({
                _id: `m_${Date.now()}`,
                workspaceId: wsId,
                userId: userId,
                role: fallbackInvitations[idx].role,
                permission: fallbackInvitations[idx].permission,
                modules: fallbackInvitations[idx].modules
            });

            return res.json({ success: true, message: 'Invitation accepted successfully' });
        }

        const invitation = await WorkspaceInvitation.findById(invitationId);
        if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

        invitation.status = 'Accepted';
        await invitation.save();

        // Create WorkspaceMembership
        await WorkspaceMembership.findOneAndUpdate(
            { workspaceId: invitation.workspaceId, userId },
            {
                role: invitation.role,
                department: invitation.department,
                permission: invitation.permission,
                modules: invitation.modules
            },
            { upsert: true, new: true }
        );

        // Update Workspace members count
        await Workspace.findByIdAndUpdate(invitation.workspaceId, {
            $inc: { membersCount: 1 }
        });

        // Notify Inviter
        const user = await User.findById(userId);
        const workspace = await Workspace.findById(invitation.workspaceId);
        await createNotification(invitation.inviterId, {
            title: 'Invitation Accepted',
            desc: `${user.name || 'An advocate'} accepted your invitation to join ${workspace.name}.`,
            category: 'System',
            priority: 'Medium',
            type: 'success'
        });

        res.json({ success: true, message: 'Invitation accepted successfully' });
    } catch (error) {
        console.error('[ACCEPT INVITATION ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to accept invitation' });
    }
};

export const rejectInvitation = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { invitationId } = req.params;

        const isMockOrDbDown = mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(invitationId);
        if (isMockOrDbDown) {
            console.log('[WORKSPACE CONTROLLER] DB Down or Mock ID. Simulating invitation rejection.');
            const idx = fallbackInvitations.findIndex(i => i._id === invitationId);
            if (idx !== -1) {
                fallbackInvitations[idx].status = 'Rejected';
            }
            return res.json({ success: true, message: 'Invitation rejected successfully' });
        }

        const invitation = await WorkspaceInvitation.findById(invitationId);
        if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

        invitation.status = 'Rejected';
        await invitation.save();

        // Notify Inviter
        const user = await User.findById(userId);
        const workspace = await Workspace.findById(invitation.workspaceId);
        await createNotification(invitation.inviterId, {
            title: 'Invitation Rejected',
            desc: `${user.name || 'An advocate'} rejected your invitation to join ${workspace.name}.`,
            category: 'System',
            priority: 'Medium',
            type: 'error'
        });

        res.json({ success: true, message: 'Invitation rejected successfully' });
    } catch (error) {
        console.error('[REJECT INVITATION ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to reject invitation' });
    }
};

export const getWorkspaceMembers = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { workspaceId } = req.params;

        const isMockOrDbDown = mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(workspaceId);
        
        if (isMockOrDbDown) {
            console.log('[WORKSPACE CONTROLLER] DB Down or Mock ID. Returning mock workspace members.');
            const currentUser = await User.findById(userId).catch(() => null);
            const ownerName = currentUser?.name || currentUser?.fullName || 'Adv. Aditi Lakhera';
            const ownerEmail = currentUser?.email || 'aditi@uwo24.com';

            const mockMembers = [
                {
                    id: `mem_owner_${userId}`,
                    userId: userId,
                    name: ownerName,
                    fullName: ownerName,
                    email: ownerEmail,
                    phone: currentUser?.phone || currentUser?.mobile || '+91 98765 43210',
                    avatar: currentUser?.avatar || currentUser?.photo || '⚖️',
                    role: 'Managing Partner',
                    department: 'Corporate & Litigation',
                    permission: 'Administrator',
                    status: 'Accepted',
                    isOwner: true,
                    joinedDate: new Date()
                }
            ];

            return res.json({
                success: true,
                members: mockMembers,
                stats: {
                    totalMembers: mockMembers.length,
                    activeMembers: mockMembers.length,
                    pendingInvitations: fallbackInvitations.filter(i => i.status === 'Pending' && (i.workspaceId === workspaceId || i.workspaceId?.toString() === workspaceId)).length,
                    departmentsCount: 1,
                    departments: ['Corporate & Litigation']
                }
            });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ success: false, error: 'Workspace not found' });
        }

        // Auto-heal / Ensure workspace owner has a WorkspaceMembership record
        if (workspace.ownerId) {
            const ownerMembershipExists = await WorkspaceMembership.findOne({
                workspaceId: workspace._id,
                userId: workspace.ownerId
            });

            if (!ownerMembershipExists) {
                await WorkspaceMembership.create({
                    workspaceId: workspace._id,
                    userId: workspace.ownerId,
                    role: 'Managing Partner',
                    department: 'Corporate & Management',
                    permission: 'Administrator',
                    modules: ['Firm Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks', 'Hearings', 'Calendar', 'Research', 'AI Assistant', 'Reports', 'Billing', 'Client CRM']
                });
            }
        }

        // Fetch all accepted memberships
        const memberships = await WorkspaceMembership.find({
            $or: [{ workspaceId: workspace._id }, { workspaceId: workspaceId }]
        }).populate('userId', 'name fullName email phone mobile avatar photo barCouncilNo stateBarCouncil');

        const pendingCount = await WorkspaceInvitation.countDocuments({
            $or: [{ workspaceId: workspace._id }, { workspaceId: workspaceId }],
            status: 'Pending'
        });

        const formattedMembers = [];
        const departmentsSet = new Set();

        for (const mem of memberships) {
            const u = typeof mem.userId === 'object' && mem.userId !== null ? mem.userId : {};
            const isOwner = Boolean(workspace.ownerId && u._id && u._id.toString() === workspace.ownerId.toString());

            // Strictly skip dummy/orphaned membership records where no real accepted user account exists
            if ((!u._id || !u.email) && !isOwner) {
                continue;
            }

            const dept = mem.department || 'General Practice';
            departmentsSet.add(dept);

            let realName = u.fullName || u.name;
            if (!realName || realName === 'Team Member' || realName === 'TeamMember') {
                if (u.email) {
                    const emailPrefix = u.email.split('@')[0];
                    const formatted = emailPrefix
                        .replace(/[._-]/g, ' ')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');
                    realName = formatted.toLowerCase().includes('adv') ? formatted : `Adv. ${formatted}`;
                } else {
                    realName = 'Adv. Aditi Lakhera';
                }
            }

            formattedMembers.push({
                id: mem._id.toString(),
                userId: (u._id || mem.userId || '').toString(),
                name: realName,
                fullName: realName,
                email: u.email || '',
                phone: u.phone || u.mobile || '',
                barCouncilNo: u.barCouncilNo || '',
                stateBarCouncil: u.stateBarCouncil || '',
                avatar: u.avatar || u.photo || '⚖️',
                role: mem.role || 'Associate Advocate',
                department: dept,
                permission: mem.permission || 'Standard Member',
                modules: mem.modules || [],
                status: 'Accepted',
                isOwner: Boolean(isOwner),
                joinedDate: mem.createdAt || mem.joinedDate || new Date()
            });
        }

        // If no memberships found in DB yet, auto-populate the workspace owner / logged-in user
        if (formattedMembers.length === 0) {
            const ownerUser = workspace.ownerId ? await User.findById(workspace.ownerId) : await User.findById(req.user.id || req.user._id);
            const ownerName = ownerUser?.fullName || ownerUser?.name || 'Adv. Aditi Lakhera';
            const ownerEmail = ownerUser?.email || 'aditi@uwo24.com';

            formattedMembers.push({
                id: `mem_owner_${ownerUser?._id || 'default'}`,
                userId: (ownerUser?._id || 'default').toString(),
                name: ownerName,
                fullName: ownerName,
                email: ownerEmail,
                phone: ownerUser?.phone || ownerUser?.mobile || '+91 98765 43210',
                barCouncilNo: ownerUser?.barCouncilNo || '',
                stateBarCouncil: ownerUser?.stateBarCouncil || '',
                avatar: ownerUser?.avatar || ownerUser?.photo || '⚖️',
                role: 'Managing Partner',
                department: 'Corporate & Management',
                permission: 'Administrator',
                modules: ['Firm Dashboard', 'Cases', 'Documents', 'Evidence', 'Tasks', 'Hearings', 'Calendar', 'Research', 'AI Assistant', 'Reports', 'Billing', 'Client CRM'],
                status: 'Accepted',
                isOwner: true,
                joinedDate: new Date()
            });
            departmentsSet.add('Corporate & Management');
        }

        // Sort so Firm Owner is always #1 at the top
        formattedMembers.sort((a, b) => (b.isOwner ? 1 : 0) - (a.isOwner ? 1 : 0));

        const departmentsList = Array.from(departmentsSet);

        res.json({
            success: true,
            members: formattedMembers,
            stats: {
                totalMembers: formattedMembers.length,
                activeMembers: formattedMembers.filter(m => m.status === 'Active' || m.status === 'Accepted').length,
                pendingInvitations: pendingCount,
                departmentsCount: departmentsList.length,
                departments: departmentsList
            }
        });
    } catch (error) {
        console.error('[GET WORKSPACE MEMBERS ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to fetch workspace members' });
    }
};

// 10. Update Member Role, Department & Permissions
export const updateMemberRoleAndPermissions = async (req, res) => {
    try {
        const { workspaceId, memberId } = req.params;
        const { role, department, permission, modules } = req.body;

        const membership = await WorkspaceMembership.findOne({
            _id: memberId,
            $or: [{ workspaceId }, { workspaceId: new mongoose.Types.ObjectId(workspaceId) }]
        });

        if (!membership) {
            return res.status(404).json({ success: false, error: 'Member not found in workspace' });
        }

        if (role) membership.role = role;
        if (department) membership.department = department;
        if (permission) membership.permission = permission;
        if (Array.isArray(modules)) membership.modules = modules;

        await membership.save();

        res.json({
            success: true,
            message: 'Member role and permissions updated successfully',
            membership
        });
    } catch (error) {
        console.error('[UPDATE MEMBER ROLE ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to update member role' });
    }
};

// 11. Toggle Member Status (Suspend / Reactivate)
export const toggleMemberStatus = async (req, res) => {
    try {
        const { workspaceId, memberId } = req.params;
        const { status } = req.body; // 'Active' | 'Suspended'

        const workspace = await Workspace.findById(workspaceId);
        const membership = await WorkspaceMembership.findOne({
            _id: memberId,
            $or: [{ workspaceId }, { workspaceId: new mongoose.Types.ObjectId(workspaceId) }]
        });

        if (!membership) {
            return res.status(404).json({ success: false, error: 'Member not found in workspace' });
        }

        // Firm Owner protection check
        if (workspace && workspace.ownerId && membership.userId.toString() === workspace.ownerId.toString()) {
            return res.status(403).json({ success: false, error: 'Firm Owner cannot be suspended or modified.' });
        }

        membership.status = status || (membership.status === 'Suspended' ? 'Active' : 'Suspended');
        await membership.save();

        res.json({
            success: true,
            message: `Member status set to ${membership.status}`,
            status: membership.status
        });
    } catch (error) {
        console.error('[TOGGLE MEMBER STATUS ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to update member status' });
    }
};

// 12. Remove Workspace Member with Work Reassignment Option
export const removeWorkspaceMember = async (req, res) => {
    try {
        const { workspaceId, memberId } = req.params;
        const { transferToUserId } = req.body;

        const workspace = await Workspace.findById(workspaceId);
        const membership = await WorkspaceMembership.findOne({
            _id: memberId,
            $or: [{ workspaceId }, { workspaceId: new mongoose.Types.ObjectId(workspaceId) }]
        });

        if (!membership) {
            return res.status(404).json({ success: false, error: 'Member not found in workspace' });
        }

        // Firm Owner protection check
        if (workspace && workspace.ownerId && membership.userId.toString() === workspace.ownerId.toString()) {
            return res.status(403).json({ success: false, error: 'The Firm Owner cannot be removed from the firm.' });
        }

        // Optional Work Reassignment if transferToUserId provided
        if (transferToUserId && mongoose.Types.ObjectId.isValid(transferToUserId)) {
            const targetUser = await User.findById(transferToUserId);
            if (targetUser) {
                // Reassign assigned projects/cases
                await Project.updateMany(
                    { workspaceId: workspace._id, leadAdvocateUserId: membership.userId },
                    { $set: { leadAdvocateUserId: targetUser._id, leadAdvocate: targetUser.fullName || targetUser.name } }
                );
            }
        }

        // Remove workspace membership record
        await WorkspaceMembership.deleteOne({ _id: membership._id });

        res.json({
            success: true,
            message: 'Member removed from firm workspace successfully.'
        });
    } catch (error) {
        console.error('[REMOVE WORKSPACE MEMBER ERROR]', error);
        res.status(500).json({ success: false, error: 'Failed to remove member from workspace' });
    }
};


