import express from 'express';
import crypto from 'crypto';
import AdvocateInvitation from '../models/AdvocateInvitation.js';
import User from '../models/User.js';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import { sendAdvocateInvitationEmail } from '../services/emailService.js';

const router = express.Router();

const getClientBaseUrl = () => {
  return process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://app.ailegal.com';
};

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// @route   POST /api/admin/invitations/advocate
// @desc    Create and send a secure advocate invitation
// @access  Admin
router.post('/admin/invitations/advocate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim();

    // Check for existing active invitation
    const existing = await AdvocateInvitation.findOne({
      invitedEmail: cleanEmail,
      status: 'invited',
      expiresAt: { $gt: new Date() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'INVITATION_ALREADY_EXISTS',
        message: `An active invitation has already been sent to ${cleanEmail}. You can resend or revoke it from the table.`,
        invitationId: existing._id
      });
    }

    // Generate cryptographically secure token
    const secureToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await AdvocateInvitation.create({
      invitedEmail: cleanEmail,
      invitedName: cleanName,
      invitedBy: req.user.id,
      secureToken,
      expiresAt,
      status: 'invited'
    });

    // Construct invitation URL
    const baseUrl = getClientBaseUrl();
    const inviteUrl = `${baseUrl}/invite/advocate/${secureToken}`;

    // Dispatch email
    try {
      await sendAdvocateInvitationEmail({
        invitedEmail: cleanEmail,
        invitedName: cleanName,
        inviteUrl,
        expiresAt
      });
    } catch (mailErr) {
      console.warn('[INVITATION EMAIL ERROR] Could not dispatch email:', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${cleanEmail}`,
      invitation: {
        id: invitation._id,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      }
    });
  } catch (err) {
    console.error('[ADMIN CREATE INVITATION ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to create advocate invitation.' });
  }
});

// @route   POST /api/admin/invitations/advocate/:id/resend
// @desc    Regenerate token and resend invitation email
// @access  Admin
router.post('/admin/invitations/advocate/:id/resend', verifyToken, isAdmin, async (req, res) => {
  try {
    const invitation = await AdvocateInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'This invitation has already been accepted.' });
    }

    // Invalidate old token by generating a fresh one
    const newSecureToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    invitation.secureToken = newSecureToken;
    invitation.expiresAt = newExpiresAt;
    invitation.status = 'invited';
    await invitation.save();

    const baseUrl = getClientBaseUrl();
    const inviteUrl = `${baseUrl}/invite/advocate/${newSecureToken}`;

    try {
      await sendAdvocateInvitationEmail({
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        inviteUrl,
        expiresAt: newExpiresAt
      });
    } catch (mailErr) {
      console.warn('[RESEND INVITATION EMAIL ERROR]', mailErr.message);
    }

    res.json({
      success: true,
      message: `Invitation resent to ${invitation.invitedEmail}`,
      invitation: {
        id: invitation._id,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (err) {
    console.error('[ADMIN RESEND INVITATION ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to resend invitation.' });
  }
});

// @route   POST /api/admin/invitations/advocate/:id/revoke
// @desc    Revoke an active invitation
// @access  Admin
router.post('/admin/invitations/advocate/:id/revoke', verifyToken, isAdmin, async (req, res) => {
  try {
    const invitation = await AdvocateInvitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Cannot revoke an already accepted invitation.' });
    }

    invitation.status = 'revoked';
    await invitation.save();

    res.json({
      success: true,
      message: `Invitation for ${invitation.invitedEmail} has been revoked.`,
      invitation: {
        id: invitation._id,
        status: invitation.status
      }
    });
  } catch (err) {
    console.error('[ADMIN REVOKE INVITATION ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to revoke invitation.' });
  }
});

// ==========================================
// PUBLIC / ADVOCATE CONSUMER ENDPOINTS
// ==========================================

// @route   GET /api/invitations/advocate/:token
// @desc    Validate invitation token & get public invite details
// @access  Public
router.get('/invitations/advocate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 16) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid invitation link.'
      });
    }

    const invitation = await AdvocateInvitation.findOne({ secureToken: token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Invitation not found or invalid link.'
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(410).json({
        success: false,
        code: 'REVOKED',
        message: 'This invitation is no longer active.'
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_ACCEPTED',
        message: 'This invitation has already been used.'
      });
    }

    if (invitation.isExpired()) {
      if (invitation.status !== 'expired') {
        invitation.status = 'expired';
        await invitation.save().catch(() => {});
      }
      return res.status(410).json({
        success: false,
        code: 'EXPIRED',
        message: 'This invitation has expired.'
      });
    }

    // Return only safe non-sensitive attributes
    res.json({
      success: true,
      invitation: {
        id: invitation._id,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        role: invitation.role,
        purpose: invitation.purpose,
        expiresAt: invitation.expiresAt,
        status: invitation.status
      }
    });
  } catch (err) {
    console.error('[VALIDATE INVITATION ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to validate invitation.' });
  }
});

// @route   POST /api/invitations/advocate/:token/accept-consent
// @desc    Accept mandatory consultation consent & link user
// @access  Authenticated (User must be logged in with matching email)
router.post('/invitations/advocate/:token/accept-consent', verifyToken, async (req, res) => {
  try {
    const { token } = req.params;
    const { consentAccepted, barCredentials, practiceDetails } = req.body;

    if (!consentAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must review and accept the Advocate Profile & Consultation Terms to proceed.'
      });
    }

    const invitation = await AdvocateInvitation.findOne({ secureToken: token });

    if (!invitation) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Invitation not found.' });
    }

    if (invitation.status === 'revoked') {
      return res.status(410).json({ success: false, code: 'REVOKED', message: 'This invitation is no longer active.' });
    }

    if (invitation.status === 'accepted') {
      return res.status(409).json({ success: false, code: 'ALREADY_ACCEPTED', message: 'This invitation has already been accepted.' });
    }

    if (invitation.isExpired()) {
      return res.status(410).json({ success: false, code: 'EXPIRED', message: 'This invitation has expired.' });
    }

    // SECURITY CHECK: Verify authenticated email strictly matches invitedEmail
    const authenticatedEmail = (req.user.email || '').toLowerCase().trim();
    const invitedEmail = invitation.invitedEmail.toLowerCase().trim();

    if (authenticatedEmail !== invitedEmail) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_MISMATCH',
        message: `This invitation was sent to ${invitation.invitedEmail}. You are currently signed in with ${req.user.email}.`,
        invitedEmail: invitation.invitedEmail,
        currentEmail: req.user.email
      });
    }

    // Update Invitation
    const now = new Date();
    invitation.status = 'accepted';
    invitation.acceptedAt = now;
    invitation.consentAcceptedAt = now;
    invitation.linkedUserId = req.user.id;
    invitation.verificationStatus = 'pending';
    await invitation.save();

    // Update User Profile
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    if (!user.advocateVerification) {
      user.advocateVerification = {};
    }

    user.advocateVerification.listingConsent = 'accepted';
    user.advocateVerification.listingConsentAt = now;
    user.advocateVerification.verificationSubmittedAt = now;
    user.advocateVerification.verificationStatus = 'pending';

    // If professional details were provided during consent
    if (barCredentials) {
      if (barCredentials.barCouncil) user.advocateVerification.barCouncil = barCredentials.barCouncil;
      if (barCredentials.barEnrollmentNumber) user.advocateVerification.barEnrollmentNumber = barCredentials.barEnrollmentNumber;
      if (barCredentials.enrollmentYear) user.advocateVerification.enrollmentYear = barCredentials.enrollmentYear;
    }

    if (practiceDetails) {
      if (practiceDetails.practiceAreas) user.advocateVerification.practiceAreas = practiceDetails.practiceAreas;
      if (practiceDetails.courts) user.advocateVerification.primaryCourts = practiceDetails.courts;
      if (practiceDetails.experienceYears) user.advocateVerification.experienceYears = practiceDetails.experienceYears;
      if (practiceDetails.languages) user.advocateVerification.languages = practiceDetails.languages;
      if (practiceDetails.bio) user.advocateVerification.bio = practiceDetails.bio;
      if (practiceDetails.consultationFee) user.advocateVerification.consultationFee = practiceDetails.consultationFee;
      if (practiceDetails.availability) user.advocateVerification.availability = practiceDetails.availability;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Registration submitted. Your advocate profile and credentials have been submitted for verification.',
      invitation: {
        id: invitation._id,
        status: invitation.status,
        acceptedAt: invitation.acceptedAt
      },
      advocateVerification: user.advocateVerification
    });
  } catch (err) {
    console.error('[ACCEPT INVITATION CONSENT ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to process invitation acceptance.' });
  }
});

export default router;
