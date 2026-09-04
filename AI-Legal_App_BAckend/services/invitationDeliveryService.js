import mongoose from 'mongoose';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceInvitation from '../models/WorkspaceInvitation.js';
import { createNotification } from './notificationService.js';
import crypto from 'crypto';

export class InvitationDeliveryService {
    /**
     * Automatically routing the workspace invitation based on invitee account status
     */
    static async deliver({
        workspaceId,
        inviterId,
        fullName,
        email,
        mobile,
        role,
        department,
        permission,
        modules,
        personalMessage,
        barCouncilNo,
        stateBarCouncil
    }) {
        const token = crypto.randomBytes(20).toString('hex');
        const dbReady = mongoose.connection.readyState === 1;

        // 1. Detect if the user already has an account
        let existingUser = null;
        if (dbReady) {
            const orConditions = [];
            if (email) {
                const safeEmail = email.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                orConditions.push({ email: new RegExp('^' + safeEmail + '$', 'i') });
            }
            if (mobile) {
                const cleanMobile = mobile.trim();
                orConditions.push({ phone: cleanMobile }, { mobile: cleanMobile });
            }

            if (orConditions.length > 0) {
                existingUser = await User.findOne({ $or: orConditions });
            }
        }

        const recipientAccountExists = !!existingUser;
        const targetChannels = [];

        // 2. Select delivery channels based on existence
        if (recipientAccountExists) {
            // Scenario 1: Existing User -> In-app popup/notification + backup email
            targetChannels.push('In-App Notification', 'Email Backup');
        } else {
            // Scenario 2: New User -> Onboarding Email Invitation (and future integrations)
            targetChannels.push('Onboarding Email Invitation');
        }

        // Future integrations placeholder (WhatsApp, SMS, Slack, Calendar)
        const isWhatsAppEnabled = false; 
        if (isWhatsAppEnabled) {
            targetChannels.push('WhatsApp Onboarding');
        }

        // 3. Log delivery history & print simulated logs
        console.log(`\n--- AUTOMATIC SMART INVITATION ROUTER ---`);
        console.log(`Invited Advocate: ${fullName} (${email || mobile})`);
        console.log(`Account Status: ${recipientAccountExists ? 'EXISTING USER' : 'NEW USER'}`);
        console.log(`Chosen Delivery Channels: ${targetChannels.join(', ')}`);
        
        if (recipientAccountExists) {
            console.log(`[IN-APP] Dispatched Workspace Invitation to user ID: ${existingUser._id}`);
            console.log(`[EMAIL BACKUP] Dispatched notification link to: ${email}`);
        } else {
            console.log(`[EMAIL ONBOARDING] Dispatched setup link: http://ailegal.in/join?token=${token}`);
        }
        console.log(`-----------------------------------------\n`);

        let invitation = null;
        const normalizedEmail = email ? email.toLowerCase().trim() : '';
        const normalizedMobile = mobile ? mobile.trim() : '';

        console.log(`[INVITE] Current firm workspace: ${workspaceId}`);
        console.log(`[INVITE] Inviting user: ${fullName} (${normalizedEmail || normalizedMobile})`);

        if (dbReady && (mongoose.Types.ObjectId.isValid(workspaceId) || workspaceId)) {
            const wsObjId = mongoose.Types.ObjectId.isValid(workspaceId) ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;

            // Check for existing pending invitation for same workspace & invitee to avoid duplicates
            const matchCriteria = [];
            if (normalizedEmail) matchCriteria.push({ email: normalizedEmail });
            if (normalizedMobile) matchCriteria.push({ mobile: normalizedMobile });

            let existingInvite = null;
            if (matchCriteria.length > 0) {
                existingInvite = await WorkspaceInvitation.findOne({
                    $and: [
                        { $or: [{ workspaceId: wsObjId }, { workspaceId: workspaceId }] },
                        { status: 'Pending' },
                        { $or: matchCriteria }
                    ]
                });
            }

            if (existingInvite) {
                console.log(`[INVITE] Re-using existing pending invitation: ${existingInvite._id}`);
                existingInvite.fullName = fullName;
                existingInvite.role = role;
                existingInvite.department = department;
                existingInvite.permission = permission;
                existingInvite.modules = modules;
                existingInvite.deliveryMethods = targetChannels;
                existingInvite.personalMessage = personalMessage;
                existingInvite.barCouncilNo = barCouncilNo;
                existingInvite.stateBarCouncil = stateBarCouncil;
                invitation = await existingInvite.save();
            } else {
                invitation = await WorkspaceInvitation.create({
                    workspaceId: wsObjId,
                    inviterId,
                    email: normalizedEmail,
                    mobile: normalizedMobile,
                    fullName,
                    role,
                    department,
                    permission,
                    modules,
                    deliveryMethods: targetChannels,
                    personalMessage,
                    token,
                    barCouncilNo,
                    stateBarCouncil,
                    status: 'Pending'
                });
                console.log(`[INVITE] Created new invitation: ${invitation._id}`);
            }

            // Send In-App notification
            if (recipientAccountExists && existingUser) {
                const workspace = await Workspace.findById(workspaceId);
                await createNotification(existingUser._id, {
                    title: 'New Invitation',
                    desc: `${workspace ? workspace.name : 'A Law Firm'} invited you to join their workspace.`,
                    category: 'System',
                    priority: 'High',
                    type: 'info',
                    data: {
                        type: 'workspace_invite',
                        invitationId: invitation._id.toString(),
                        workspaceName: workspace ? workspace.name : 'Law Firm',
                        role,
                        department
                    }
                });
            }
        } else {
            // Simulated memory database record
            invitation = {
                _id: `inv_${Date.now()}`,
                workspaceId,
                inviterId,
                email: normalizedEmail,
                mobile: normalizedMobile,
                fullName,
                role,
                department,
                permission,
                modules,
                deliveryMethods: targetChannels,
                personalMessage,
                token,
                barCouncilNo,
                stateBarCouncil,
                status: 'Pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        console.log(`[INVITE] Invitation status: ${invitation.status}`);

        return {
            success: true,
            recipientAccountExists,
            channelsDelivered: targetChannels,
            invitation
        };
    }
}
