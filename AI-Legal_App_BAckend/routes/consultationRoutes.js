import express from 'express';
import User from '../models/User.js';
import ConsultationRequest from '../models/ConsultationRequest.js';
import ConsultationMessage from '../models/ConsultationMessage.js';
import { createNotification } from '../services/notificationService.js';
import { verifyToken } from '../middleware/authorization.js';

const router = express.Router();

/**
 * Helper to sanitize advocate data for public directory and profile.
 * STRICT PRIVACY REQUIREMENT: Never expose Aadhaar, PAN, private docs, or private phone numbers.
 */
function sanitizeAdvocateProfile(user) {
    const adv = user.personalizations?.advocateProfile || {};
    const ver = user.advocateVerification || {};

    const practiceAreas = ver.practiceAreas?.length ? ver.practiceAreas : (adv.practiceAreas || ['Civil Law', 'Corporate Law']);
    const primaryCourts = ver.primaryCourts?.length ? ver.primaryCourts : (adv.primaryCourt ? [adv.primaryCourt] : ['High Court']);
    const languages = ver.languages?.length ? ver.languages : (adv.languagesKnown ? adv.languagesKnown.split(',').map(s => s.trim()) : ['English', 'Hindi']);
    const experience = ver.experienceYears || adv.practiceExperience || '8+ Years';
    const barCouncil = ver.barCouncil || adv.stateBarCouncil || 'Bar Council of Delhi';
    const enrollmentYear = adv.enrollmentYear || '2016';
    const bio = ver.bio || adv.bio || `${user.fullName || user.name} is a verified advocate specializing in ${practiceAreas.slice(0, 3).join(', ')}.`;

    return {
        _id: user._id,
        id: user._id,
        name: ver.fullName || user.fullName || user.name || 'Advocate',
        fullName: ver.fullName || user.fullName || user.name || 'Advocate',
        avatar: user.avatar || '/User.jpeg',
        verified: ver.verificationStatus === 'verified',
        verificationStatus: ver.verificationStatus,
        listingConsent: ver.listingConsent,
        practiceAreas,
        primaryCourts,
        primaryCourt: primaryCourts[0] || 'High Court',
        experience,
        languages,
        languagesKnown: languages.join(', '),
        consultationFee: ver.consultationFee || 1500,
        consultationTypes: ver.consultationTypes || ['chat', 'audio', 'video'],
        availability: ver.availability || 'Available Today',
        rating: ver.rating || 4.9,
        totalConsultations: ver.totalConsultations || 42,
        bio,
        barCouncil,
        enrollmentYear,
        city: adv.city || user.state || 'New Delhi',
        state: user.state || adv.state || 'Delhi',
        country: user.country || 'India'
    };
}

// @desc    Get verified advocates directory (Only verified + accepted consent)
// @route   GET /api/consultations/advocates
// @access  Public
router.get('/advocates', async (req, res) => {
    try {
        const { search, practiceArea, location, court, language, maxFee } = req.query;

        // Base filter: Active accounts that are VERIFIED and have ACCEPTED public listing consent
        const query = {
            accountStatus: { $ne: 'inactive' },
            deletedAt: null,
            'advocateVerification.verificationStatus': 'verified',
            'advocateVerification.listingConsent': 'accepted'
        };

        if (maxFee) {
            query['advocateVerification.consultationFee'] = { $lte: Number(maxFee) };
        }

        const advocates = await User.find(query)
            .select('name fullName avatar state country personalizations.advocateProfile advocateVerification')
            .lean();

        let filtered = advocates.map(sanitizeAdvocateProfile);

        // Apply in-memory search and keyword filters
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = filtered.filter(a =>
                a.name.toLowerCase().includes(q) ||
                a.practiceAreas.some(p => p.toLowerCase().includes(q)) ||
                a.primaryCourts.some(c => c.toLowerCase().includes(q)) ||
                a.city.toLowerCase().includes(q) ||
                a.state.toLowerCase().includes(q) ||
                a.bio.toLowerCase().includes(q)
            );
        }

        if (practiceArea && practiceArea !== 'All') {
            filtered = filtered.filter(a =>
                a.practiceAreas.some(p => p.toLowerCase() === practiceArea.toLowerCase())
            );
        }

        if (location && location !== 'All') {
            filtered = filtered.filter(a =>
                a.state.toLowerCase().includes(location.toLowerCase()) ||
                a.city.toLowerCase().includes(location.toLowerCase())
            );
        }

        if (court && court !== 'All') {
            filtered = filtered.filter(a =>
                a.primaryCourts.some(c => c.toLowerCase().includes(court.toLowerCase()))
            );
        }

        if (language && language !== 'All') {
            filtered = filtered.filter(a =>
                a.languages.some(l => l.toLowerCase() === language.toLowerCase())
            );
        }

        res.json({
            success: true,
            total: filtered.length,
            advocates: filtered
        });
    } catch (err) {
        console.error('[Consultation API] Error fetching advocates:', err);
        res.status(500).json({ success: false, message: 'Failed to load verified advocates.' });
    }
});

// @desc    Get single advocate public profile
// @route   GET /api/consultations/advocates/:id
// @access  Public
router.get('/advocates/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name fullName avatar state country personalizations.advocateProfile advocateVerification accountStatus deletedAt')
            .lean();

        if (!user || user.accountStatus === 'inactive' || user.deletedAt) {
            return res.status(404).json({ success: false, message: 'Advocate profile not found.' });
        }

        // Only verified advocates can be viewed through public consultation route
        if (user.advocateVerification?.verificationStatus !== 'verified') {
            return res.status(403).json({ success: false, message: 'Advocate is not publicly verified.' });
        }

        const profile = sanitizeAdvocateProfile(user);
        res.json({ success: true, advocate: profile });
    } catch (err) {
        console.error('[Consultation API] Error fetching advocate profile:', err);
        res.status(500).json({ success: false, message: 'Failed to load advocate profile.' });
    }
});

// @desc    Create a consultation request
// @route   POST /api/consultations/requests
// @access  Private
router.post('/requests', verifyToken, async (req, res) => {
    try {
        const {
            advocateId,
            consultationType,
            scheduledDate,
            scheduledTimeSlot,
            practiceArea,
            legalIssueSummary,
            uploadedDocuments
        } = req.body;

        if (!advocateId) {
            return res.status(400).json({ success: false, message: 'Target advocate ID is required.' });
        }
        if (!legalIssueSummary || !legalIssueSummary.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide a summary of your legal issue.' });
        }

        const advocate = await User.findById(advocateId).lean();
        if (!advocate) {
            return res.status(404).json({ success: false, message: 'Advocate not found.' });
        }

        const user = await User.findById(req.user.id).lean();
        const advocateName = advocate.fullName || advocate.name || 'Verified Advocate';
        const fee = advocate.advocateVerification?.consultationFee || 1500;

        // Check if an existing active consultation already exists with this advocate
        const existingActiveRequest = await ConsultationRequest.findOne({
            userId: req.user.id,
            advocateId: advocate._id,
            status: { $in: ['pending', 'accepted', 'scheduled'] }
        }).sort({ updatedAt: -1 });

        if (existingActiveRequest) {
            // Update existing consultation with the new mode, date, slot, and summary
            existingActiveRequest.consultationType = consultationType || existingActiveRequest.consultationType;
            if (scheduledDate) {
                existingActiveRequest.scheduledDate = new Date(scheduledDate);
            }
            if (scheduledTimeSlot) {
                existingActiveRequest.scheduledTimeSlot = scheduledTimeSlot;
            }
            if (practiceArea) {
                existingActiveRequest.practiceArea = practiceArea;
            }
            if (legalIssueSummary && legalIssueSummary.trim()) {
                existingActiveRequest.legalIssueSummary = legalIssueSummary.trim();
            }
            if (uploadedDocuments && uploadedDocuments.length > 0) {
                existingActiveRequest.uploadedDocuments = [
                    ...(existingActiveRequest.uploadedDocuments || []),
                    ...uploadedDocuments
                ];
            }

            existingActiveRequest.timeline.push({
                status: existingActiveRequest.status,
                title: 'Consultation Mode & Slot Updated',
                description: `Mode updated to ${consultationType?.toUpperCase() || 'NEW MODE'}${scheduledDate ? ' on ' + new Date(scheduledDate).toLocaleDateString() : ''}.`,
                timestamp: new Date()
            });

            await existingActiveRequest.save();

            return res.status(200).json({
                success: true,
                message: `Consultation updated to ${consultationType || 'new mode'} successfully.`,
                request: existingActiveRequest
            });
        }

        // Generate human-friendly request ID
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const requestId = `REQ-${new Date().getFullYear()}-${randomDigits}`;

        const initialTimeline = [
            {
                status: 'pending',
                title: 'Request Submitted',
                description: `Consultation request sent to Adv. ${advocateName}.`,
                timestamp: new Date()
            }
        ];

        const requestDoc = new ConsultationRequest({
            requestId,
            userId: req.user.id,
            advocateId: advocate._id,
            advocateName,
            advocateAvatar: advocate.avatar || '/User.jpeg',
            userName: user?.fullName || user?.name || 'Client',
            userEmail: user?.email || '',
            userPhone: user?.phone || '',
            consultationType: consultationType || 'chat',
            scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 24 * 3600 * 1000),
            scheduledTimeSlot: scheduledTimeSlot || '11:00 AM - 11:45 AM',
            practiceArea: practiceArea || 'General Legal Consultation',
            legalIssueSummary: legalIssueSummary.trim(),
            uploadedDocuments: uploadedDocuments || [],
            fee,
            paymentStatus: 'pending',
            status: 'pending',
            timeline: initialTimeline
        });

        await requestDoc.save();

        res.status(201).json({
            success: true,
            message: 'Consultation request sent successfully.',
            request: requestDoc
        });
    } catch (err) {
        console.error('[Consultation API] Error creating consultation request:', err);
        res.status(500).json({ success: false, message: 'Failed to create consultation request.' });
    }
});

// @desc    Get current user's consultation requests (My Requests)
// @route   GET /api/consultations/my-requests
// @access  Private
router.get('/my-requests', verifyToken, async (req, res) => {
    try {
        const { status } = req.query;
        const query = { userId: req.user.id };

        if (status && status !== 'all' && status !== 'All') {
            const s = status.toLowerCase();
            if (s === 'upcoming') {
                query.status = { $in: ['accepted', 'scheduled'] };
            } else if (s === 'active') {
                query.status = { $in: ['accepted', 'scheduled'] };
            } else {
                query.status = s;
            }
        }

        const requests = await ConsultationRequest.find(query)
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();

        // Deduplicate active requests so the user sees only ONE card per advocate with their latest mode
        const seenAdvocates = new Set();
        const deduplicatedRequests = [];

        for (const reqItem of requests) {
            const advKey = (reqItem.advocateId ? reqItem.advocateId.toString() : '') || reqItem.advocateName;
            if (['pending', 'accepted', 'scheduled'].includes(reqItem.status)) {
                if (seenAdvocates.has(advKey)) {
                    continue;
                }
                seenAdvocates.add(advKey);
            }
            deduplicatedRequests.push(reqItem);
        }

        res.json({
            success: true,
            total: deduplicatedRequests.length,
            requests: deduplicatedRequests
        });
    } catch (err) {
        console.error('[Consultation API] Error fetching my requests:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch consultation requests.' });
    }
});

// @desc    Get request details by ID
// @route   GET /api/consultations/requests/:id
// @access  Private
router.get('/requests/:id', verifyToken, async (req, res) => {
    try {
        const request = await ConsultationRequest.findOne({
            _id: req.params.id,
            userId: req.user.id
        }).populate('advocateId', 'name fullName avatar advocateVerification personalizations.advocateProfile');

        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        res.json({ success: true, request });
    } catch (err) {
        console.error('[Consultation API] Error fetching request details:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch request details.' });
    }
});

// @desc    Cancel a consultation request
// @route   PATCH /api/consultations/requests/:id/cancel
// @access  Private
router.patch('/requests/:id/cancel', verifyToken, async (req, res) => {
    try {
        const { reason } = req.body;
        const request = await ConsultationRequest.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        if (request.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Cannot cancel an already completed consultation.' });
        }

        request.status = 'cancelled';
        request.cancelReason = reason || 'Cancelled by client';
        request.timeline.push({
            status: 'cancelled',
            title: 'Request Cancelled',
            description: reason ? `Reason: ${reason}` : 'Cancelled by client.',
            timestamp: new Date()
        });

        await request.save();

        res.json({
            success: true,
            message: 'Consultation request cancelled.',
            request
        });
    } catch (err) {
        console.error('[Consultation API] Error cancelling request:', err);
        res.status(500).json({ success: false, message: 'Failed to cancel consultation request.' });
    }
});

// @desc    Update consultation request status (for advocate or test simulation)
// @route   PATCH /api/consultations/requests/:id/status
// @access  Private
router.patch('/requests/:id/status', verifyToken, async (req, res) => {
    try {
        const { status, scheduledDate, scheduledTimeSlot, notes } = req.body;
        const validStatuses = ['pending', 'accepted', 'scheduled', 'completed', 'cancelled', 'rejected'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const request = await ConsultationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        request.status = status;
        if (scheduledDate) request.scheduledDate = new Date(scheduledDate);
        if (scheduledTimeSlot) request.scheduledTimeSlot = scheduledTimeSlot;
        if (notes) request.advocateNotes = notes;

        const titleMap = {
            accepted: 'Request Accepted',
            scheduled: 'Consultation Scheduled',
            completed: 'Consultation Completed',
            rejected: 'Request Declined',
            cancelled: 'Request Cancelled',
            pending: 'Request Pending'
        };

        request.timeline.push({
            status,
            title: titleMap[status] || status,
            description: notes || `Consultation status changed to ${status}.`,
            timestamp: new Date()
        });

        await request.save();

        // Dispatch notification when advocate accepts or updates status
        try {
            if (status === 'accepted') {
                await createNotification(request.userId, {
                    title: 'Consultation Request Accepted',
                    message: `Adv. ${request.advocateName} has accepted your consultation request. You can now communicate directly.`,
                    category: 'Alerts',
                    priority: 'High'
                });
            } else if (status === 'rejected') {
                await createNotification(request.userId, {
                    title: 'Consultation Request Declined',
                    message: `Adv. ${request.advocateName} is currently unavailable for this consultation request.`,
                    category: 'Alerts',
                    priority: 'Medium'
                });
            }
        } catch (nErr) {
            console.warn('[Consultation API] Failed to send status notification:', nErr.message);
        }

        res.json({ success: true, request });
    } catch (err) {
        console.error('[Consultation API] Error updating status:', err);
        res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
});

// =========================================================================
// ADVOCATE VERIFICATION & REGISTRATION FLOW
// =========================================================================

// @desc    Get current advocate's verification and listing status
// @route   GET /api/consultations/advocate/status
// @access  Private (Advocate)
router.get('/advocate/status', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('name fullName avatar email phone personalizations advocateVerification')
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const advProfile = user.personalizations?.advocateProfile || {};
        const verification = user.advocateVerification || {};

        // If the advocate has not explicitly submitted the registration form with accepted consent, they are not_registered
        let effectiveStatus = verification.verificationStatus || 'not_registered';
        if (effectiveStatus !== 'verified' && verification.listingConsent !== 'accepted') {
            effectiveStatus = 'not_registered';
        }

        res.json({
            success: true,
            status: effectiveStatus,
            verificationStatus: effectiveStatus,
            listingConsent: verification.listingConsent || 'none',
            verification: {
                ...verification,
                verificationStatus: effectiveStatus,
                listingConsent: verification.listingConsent || 'none',
            },
            prefill: {
                fullName: user.fullName || user.name || '',
                avatar: user.avatar || '',
                barCouncil: verification.barCouncil || advProfile.stateBarCouncil || '',
                barEnrollmentNumber: verification.barEnrollmentNumber || advProfile.barEnrollmentNumber || '',
                enrollmentYear: verification.enrollmentYear || advProfile.enrollmentYear || '',
                practiceAreas: verification.practiceAreas?.length ? verification.practiceAreas : (advProfile.practiceAreas || []),
                courts: verification.primaryCourts?.length ? verification.primaryCourts : (advProfile.primaryCourt ? [advProfile.primaryCourt] : []),
                experienceYears: verification.experienceYears || advProfile.practiceExperience || '',
                languages: verification.languages?.length ? verification.languages : (advProfile.languagesKnown ? advProfile.languagesKnown.split(',').map(s => s.trim()) : ['English', 'Hindi']),
                bio: verification.bio || advProfile.bio || '',
                consultationFee: verification.consultationFee || 1500,
                consultationTypes: verification.consultationTypes || ['chat', 'audio', 'video'],
                availability: verification.availability || 'Available Today',
                verificationDocument: verification.verificationDocument || null
            }
        });
    } catch (err) {
        console.error('[Consultation API] Error fetching advocate verification status:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch verification status.' });
    }
});

// @desc    Register as a Verified Advocate (with mandatory consent)
// @route   POST /api/consultations/advocate/register
// @access  Private (Advocate)
router.post('/advocate/register', verifyToken, async (req, res) => {
    try {
        const {
            fullName,
            barCouncil,
            barEnrollmentNumber,
            enrollmentYear,
            practiceAreas,
            courts,
            experienceYears,
            languages,
            bio,
            consultationFee,
            consultationTypes,
            availability,
            verificationDocument,
            consentAccepted
        } = req.body;

        // Requirement 3: Consent MUST be explicitly checked and accepted
        if (!consentAccepted) {
            return res.status(400).json({
                success: false,
                message: 'You must explicitly agree to the Advocate Profile & Consultation Terms to proceed.'
            });
        }

        if (!barEnrollmentNumber || !barEnrollmentNumber.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Bar Enrollment / Registration Number is required.'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (fullName && fullName.trim()) {
            user.fullName = fullName.trim();
        }

        if (!user.advocateVerification) {
            user.advocateVerification = {};
        }

        user.advocateVerification.verificationStatus = 'pending';
        user.advocateVerification.listingConsent = 'accepted';
        user.advocateVerification.listingConsentAt = new Date();
        user.advocateVerification.verificationSubmittedAt = new Date();
        user.advocateVerification.profileStatus = 'active';
        user.advocateVerification.barCouncil = barCouncil ? barCouncil.trim() : (user.advocateVerification.barCouncil || '');
        user.advocateVerification.barEnrollmentNumber = barEnrollmentNumber.trim();
        user.advocateVerification.enrollmentYear = enrollmentYear || user.advocateVerification.enrollmentYear || '';
        user.advocateVerification.practiceAreas = Array.isArray(practiceAreas) && practiceAreas.length ? practiceAreas : (user.advocateVerification.practiceAreas || ['Civil Law', 'Criminal Law']);
        user.advocateVerification.primaryCourts = Array.isArray(courts) && courts.length ? courts : (user.advocateVerification.primaryCourts || ['High Court']);
        user.advocateVerification.experienceYears = experienceYears || user.advocateVerification.experienceYears || '5+ Years';
        user.advocateVerification.languages = Array.isArray(languages) && languages.length ? languages : (user.advocateVerification.languages || ['English', 'Hindi']);
        user.advocateVerification.bio = bio ? bio.trim() : (user.advocateVerification.bio || '');
        user.advocateVerification.consultationFee = Number(consultationFee) || 1500;
        user.advocateVerification.consultationTypes = Array.isArray(consultationTypes) && consultationTypes.length ? consultationTypes : ['chat', 'audio', 'video'];
        user.advocateVerification.availability = availability || 'Available Today';
        user.advocateVerification.rejectionReason = '';

        if (verificationDocument) {
            user.advocateVerification.verificationDocument = verificationDocument;
        }

        await user.save();

        // Send confirmation notification to advocate
        try {
            await createNotification(user._id, {
                title: 'Verification Details Submitted',
                message: 'Your professional credentials have been submitted for verification. You will be notified once approved.',
                category: 'Alerts',
                priority: 'Medium'
            });
        } catch (nErr) {
            console.warn('[Consultation API] Failed to send submission notification:', nErr.message);
        }

        res.json({
            success: true,
            message: 'Your professional details have been submitted for verification.',
            verificationStatus: 'pending',
            listingConsent: 'accepted',
            verification: user.advocateVerification
        });
    } catch (err) {
        console.error('[Consultation API] Error submitting advocate registration:', err);
        res.status(500).json({ success: false, message: 'Failed to submit advocate verification.' });
    }
});

// =========================================================================
// ADVOCATE CONSULTATION CHAT & MESSAGES
// =========================================================================

// @desc    Get advocate's consultation conversation threads
// @route   GET /api/consultations/advocate/conversations
// @access  Private (Advocate)
router.get('/advocate/conversations', verifyToken, async (req, res) => {
    try {
        const requests = await ConsultationRequest.find({ advocateId: req.user.id })
            .sort({ updatedAt: -1 })
            .lean();

        const conversations = await Promise.all(requests.map(async (r) => {
            const lastMessage = await ConsultationMessage.findOne({ consultationRequestId: r._id })
                .sort({ createdAt: -1 })
                .lean();

            const unreadCount = await ConsultationMessage.countDocuments({
                consultationRequestId: r._id,
                senderRole: 'general_user',
                isRead: false
            });

            return {
                id: r._id,
                consultationRequestId: r._id,
                requestId: r.requestId,
                userName: r.userName || 'Client',
                userEmail: r.userEmail || '',
                userAvatar: '/User.jpeg',
                subject: r.practiceArea || 'Legal Consultation',
                summary: r.legalIssueSummary,
                consultationType: r.consultationType,
                status: r.status,
                lastMessage: lastMessage?.message || r.legalIssueSummary,
                lastMessageAt: lastMessage?.createdAt || r.updatedAt || r.createdAt,
                lastMessageSender: lastMessage?.senderRole || 'general_user',
                unreadCount
            };
        }));

        res.json({
            success: true,
            total: conversations.length,
            conversations
        });
    } catch (err) {
        console.error('[Consultation API] Error fetching advocate conversations:', err);
        res.status(500).json({ success: false, message: 'Failed to load consultation conversations.' });
    }
});

// @desc    Get total unread consultation messages count for Advocate header badge
// @route   GET /api/consultations/advocate/unread-count
// @access  Private (Advocate)
router.get('/advocate/unread-count', verifyToken, async (req, res) => {
    try {
        const advocateRequests = await ConsultationRequest.find({ advocateId: req.user.id })
            .select('_id')
            .lean();

        const requestIds = advocateRequests.map(r => r._id);
        const unreadCount = await ConsultationMessage.countDocuments({
            consultationRequestId: { $in: requestIds },
            senderRole: 'general_user',
            isRead: false
        });

        res.json({ success: true, unreadCount });
    } catch (err) {
        console.error('[Consultation API] Error fetching unread count:', err);
        res.json({ success: true, unreadCount: 0 });
    }
});

// @desc    Get messages for a specific consultation request
// @route   GET /api/consultations/requests/:id/messages
// @access  Private (Advocate or Consulting User)
router.get('/requests/:id/messages', verifyToken, async (req, res) => {
    try {
        const request = await ConsultationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        const isAdvocate = request.advocateId.toString() === req.user.id.toString();
        const isClient = request.userId.toString() === req.user.id.toString();

        if (!isAdvocate && !isClient) {
            return res.status(403).json({ success: false, message: 'Unauthorized to view this conversation.' });
        }

        // Mark incoming messages as read
        if (isAdvocate) {
            await ConsultationMessage.updateMany(
                { consultationRequestId: request._id, senderRole: 'general_user', isRead: false },
                { $set: { isRead: true } }
            );
        } else {
            await ConsultationMessage.updateMany(
                { consultationRequestId: request._id, senderRole: 'advocate', isRead: false },
                { $set: { isRead: true } }
            );
        }

        const messages = await ConsultationMessage.find({ consultationRequestId: request._id })
            .sort({ createdAt: 1 })
            .lean();

        res.json({
            success: true,
            request: {
                id: request._id,
                requestId: request.requestId,
                status: request.status,
                advocateName: request.advocateName,
                advocateAvatar: request.advocateAvatar,
                userName: request.userName,
                practiceArea: request.practiceArea,
                consultationType: request.consultationType,
                scheduledDate: request.scheduledDate,
                scheduledTimeSlot: request.scheduledTimeSlot
            },
            messages
        });
    } catch (err) {
        console.error('[Consultation API] Error fetching messages:', err);
        res.status(500).json({ success: false, message: 'Failed to load messages.' });
    }
});

// @desc    Send a chat message in a consultation request
// @route   POST /api/consultations/requests/:id/messages
// @access  Private (Advocate or Consulting User)
router.post('/requests/:id/messages', verifyToken, async (req, res) => {
    try {
        const { message, attachments } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
        }

        const request = await ConsultationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        const isAdvocate = request.advocateId.toString() === req.user.id.toString();
        const isClient = request.userId.toString() === req.user.id.toString();

        if (!isAdvocate && !isClient) {
            return res.status(403).json({ success: false, message: 'Unauthorized to participate in this consultation.' });
        }

        // Requirement 13: Communication enabled according to consultation lifecycle
        if (request.status === 'cancelled' || request.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: `This consultation has been ${request.status}. Communication is closed.`
            });
        }

        const senderUser = await User.findById(req.user.id).select('name fullName avatar').lean();
        const senderName = senderUser?.fullName || senderUser?.name || (isAdvocate ? 'Advocate' : 'Client');
        const senderRole = isAdvocate ? 'advocate' : 'general_user';

        // If advocate replies to pending request, auto-transition to accepted
        if (isAdvocate && request.status === 'pending') {
            request.status = 'accepted';
            request.timeline.push({
                status: 'accepted',
                title: 'Request Accepted',
                description: `Adv. ${request.advocateName} joined the consultation chat.`,
                timestamp: new Date()
            });
        }

        const newMsg = new ConsultationMessage({
            consultationRequestId: request._id,
            senderId: req.user.id,
            senderRole,
            senderName,
            senderAvatar: senderUser?.avatar || '',
            message: message.trim(),
            attachments: attachments || [],
            isRead: false
        });

        await newMsg.save();

        request.updatedAt = new Date();
        await request.save();

        // Requirement 14: Trigger in-app notification to recipient
        try {
            const recipientId = isAdvocate ? request.userId : request.advocateId;
            const notifTitle = isAdvocate
                ? `Message from Adv. ${request.advocateName}`
                : `New message from ${request.userName}`;

            await createNotification(recipientId, {
                title: notifTitle,
                message: message.trim().slice(0, 120),
                category: 'Alerts',
                priority: 'Medium'
            });
        } catch (nErr) {
            console.warn('[Consultation API] Failed to trigger chat notification:', nErr.message);
        }

        res.status(201).json({
            success: true,
            message: newMsg,
            consultationStatus: request.status
        });
    } catch (err) {
        console.error('[Consultation API] Error sending consultation message:', err);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
});

export default router;
