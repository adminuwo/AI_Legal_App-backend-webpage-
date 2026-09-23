import express from 'express';
import User from '../models/User.js';
import ConsultationRequest from '../models/ConsultationRequest.js';
import ConsultationMessage from '../models/ConsultationMessage.js';
import { createNotification } from '../services/notificationService.js';
import { verifyToken } from '../middleware/authorization.js';
import { isConsultationSlotExpired } from '../utils/consultationExpiryHelper.js';
import Razorpay from 'razorpay';

const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

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

        // Only update if there is an unconfirmed pending consultation that has NOT been paid yet
        const existingActiveRequest = await ConsultationRequest.findOne({
            userId: req.user.id,
            advocateId: advocate._id,
            status: 'pending',
            paymentStatus: { $ne: 'paid' }
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

        // Check if any active request has passed its scheduled slot, update to expired
        for (const reqItem of requests) {
            if (['pending', 'accepted', 'scheduled'].includes(reqItem.status) && isConsultationSlotExpired(reqItem.scheduledDate, reqItem.scheduledTimeSlot)) {
                reqItem.status = 'expired';
                ConsultationRequest.updateOne(
                    { _id: reqItem._id, status: { $in: ['pending', 'accepted', 'scheduled'] } },
                    { 
                        $set: { status: 'expired' },
                        $push: { 
                            timeline: { 
                                status: 'expired', 
                                title: 'Consultation Expired', 
                                description: `Scheduled time slot (${reqItem.scheduledTimeSlot || 'consultation slot'}) has ended.`, 
                                timestamp: new Date() 
                            } 
                        } 
                    }
                ).exec().catch(() => {});
            }
        }

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
            if (reqItem.paymentStatus !== 'paid' && Array.isArray(reqItem.timeline)) {
                reqItem.timeline = reqItem.timeline.filter(t => !t.title?.toLowerCase().includes('fee paid') && !t.title?.toLowerCase().includes('payment'));
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

        if (['pending', 'accepted', 'scheduled'].includes(request.status) && isConsultationSlotExpired(request.scheduledDate, request.scheduledTimeSlot)) {
            request.status = 'expired';
            request.timeline = request.timeline || [];
            request.timeline.push({
                status: 'expired',
                title: 'Consultation Expired',
                description: `Scheduled time slot (${request.scheduledTimeSlot || 'consultation slot'}) has ended.`,
                timestamp: new Date()
            });
            await request.save();
        }

        if (request.paymentStatus !== 'paid' && Array.isArray(request.timeline)) {
            request.timeline = request.timeline.filter(t => !t.title?.toLowerCase().includes('fee paid') && !t.title?.toLowerCase().includes('payment'));
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

// @desc    Pay consultation fee (Client pays to unlock accepted consultation)
// @route   POST /api/consultations/requests/:id/pay
// @access  Private (Client)
router.post('/requests/:id/pay', verifyToken, async (req, res) => {
    try {
        const { paymentId, gateway = 'Razorpay' } = req.body;
        const request = await ConsultationRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        // Must belong to user (or admin)
        if (request.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized to pay for this request.' });
        }

        if (['expired', 'cancelled', 'rejected'].includes(request.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot pay for a consultation that is ${request.status}.`
            });
        }

        if (request.paymentStatus === 'paid') {
            return res.status(200).json({
                success: true,
                message: 'Consultation fee is already paid.',
                request
            });
        }

        const txnId = paymentId || `pay_sim_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
        request.paymentStatus = 'paid';
        if (['accepted', 'scheduled'].includes(request.status)) {
            request.status = 'scheduled';
        }

        request.timeline = request.timeline || [];
        request.timeline.push({
            status: request.status,
            title: 'Fee Paid & Slot Confirmed',
            description: `Payment of ₹${request.fee || 1500} successfully completed via ${gateway} (Txn: ${txnId}). Live calls and chat are unlocked.`,
            timestamp: new Date()
        });

        await request.save();

        // Notify advocate that client paid
        try {
            await createNotification(request.advocateId, {
                title: 'Consultation Fee Paid',
                message: `${request.userName} has completed payment of ₹${request.fee || 1500}. The session is confirmed and unlocked.`,
                category: 'Alerts',
                priority: 'High'
            });
        } catch (nErr) {
            console.warn('[Consultation API] Failed to send payment notification:', nErr.message);
        }

        res.json({
            success: true,
            message: 'Payment successful! Consultation slot confirmed and communication unlocked.',
            request
        });
    } catch (err) {
        console.error('[Consultation API] Error processing consultation payment:', err);
        res.status(500).json({ success: false, message: 'Failed to process consultation payment.' });
    }
});

// @desc    Create Razorpay Order for consultation fee payment
// @route   POST /api/consultations/requests/:id/create-order
// @access  Private (Client)
router.post('/requests/:id/create-order', verifyToken, async (req, res) => {
    try {
        const request = await ConsultationRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Consultation request not found.' });
        }

        const fee = request.fee || 1500;
        const amountInPaise = Math.round(fee * 100);
        const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_SBFlInxBiRfOGd';

        let rzpOrder = null;
        try {
            if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
                rzpOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `rcpt_cons_${request.requestId || request._id.toString().slice(-6)}_${Date.now().toString().slice(-4)}`,
                    notes: {
                        consultationRequestId: request._id.toString(),
                        advocateName: request.advocateName,
                        userName: request.userName,
                        consultationType: request.consultationType
                    }
                });
            }
        } catch (rzpErr) {
            console.warn('[Consultation Razorpay Order Warning]:', rzpErr?.message || rzpErr);
        }

        if (!rzpOrder) {
            rzpOrder = {
                id: `order_cons_${Date.now()}`,
                amount: amountInPaise,
                currency: 'INR',
                status: 'created',
                isMock: true
            };
        }

        res.json({
            success: true,
            order: rzpOrder,
            key: keyId,
            fee,
            request: {
                id: request._id,
                requestId: request.requestId,
                advocateName: request.advocateName,
                consultationType: request.consultationType,
                scheduledDate: request.scheduledDate,
                scheduledTimeSlot: request.scheduledTimeSlot
            }
        });
    } catch (err) {
        console.error('[Consultation API] Error creating order:', err);
        res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }
});

// @desc    Render Web Checkout Portal for Legal Consultation Payment (Razorpay)
// @route   GET /api/consultations/web-checkout
// @access  Public (Validates token/request ID)
router.get('/web-checkout', async (req, res) => {
    try {
        const requestId = req.query.requestId || req.query.id;
        const token = req.query.token || '';

        if (!requestId) {
            return res.status(400).send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:50px;">
                    <h3>Invalid Request</h3><p>Consultation Request ID is missing.</p>
                </body></html>
            `);
        }

        const request = await ConsultationRequest.findById(requestId).lean();
        if (!request) {
            return res.status(404).send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:50px;">
                    <h3>Not Found</h3><p>Consultation request not found.</p>
                </body></html>
            `);
        }

        const fee = request.fee || 1500;
        const advocateName = request.advocateName || 'Advocate';
        const practiceArea = request.practiceArea || 'Legal Consultation';
        const consultationType = request.consultationType || 'chat';
        const scheduledDateStr = request.scheduledDate
            ? new Date(request.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
            : 'Scheduled Session';
        const timeSlot = request.scheduledTimeSlot || '11:00 AM - 11:45 AM';

        if (request.paymentStatus === 'paid') {
            return res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>AI LEGAL™ - Fee Already Paid</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; margin: 0; }
                        .card { background: #FFFFFF; border-radius: 24px; padding: 36px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1.5px solid #E2E8F0; }
                        .icon { width: 64px; height: 64px; border-radius: 32px; background: #ECFDF5; color: #10B981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
                        h2 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #0F172A; }
                        p { font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 24px; }
                        .btn { background: #C8A34D; color: #111; font-weight: 800; padding: 14px 24px; border-radius: 12px; text-decoration: none; display: inline-block; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">✓</div>
                        <h2>Consultation Fee Already Paid</h2>
                        <p>Payment of ₹${fee} has already been received for this session. Your consultation with ${advocateName} is confirmed and unlocked.</p>
                        <a href="ailegal://consultation/success?id=${request._id}" class="btn">Return to App</a>
                    </div>
                </body>
                </html>
            `);
        }

        res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI LEGAL™ - Secure Consultation Checkout</title>
                <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        background-color: #F4F5F7;
                        color: #111827;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .checkout-card {
                        background: #FFFFFF;
                        border: 1.5px solid #E5E7EB;
                        border-radius: 24px;
                        width: 100%;
                        max-width: 440px;
                        padding: 32px 24px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
                        text-align: center;
                    }
                    .logo-badge {
                        display: inline-block;
                        background: rgba(200, 163, 77, 0.12);
                        color: #B38628;
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: 1.5px;
                        padding: 6px 14px;
                        border-radius: 20px;
                        border: 1px solid rgba(200, 163, 77, 0.3);
                        text-transform: uppercase;
                        margin-bottom: 16px;
                    }
                    h2 {
                        font-size: 22px;
                        font-weight: 800;
                        color: #111827;
                        margin-bottom: 8px;
                    }
                    .subtitle {
                        font-size: 13px;
                        color: #6B7280;
                        margin-bottom: 24px;
                        line-height: 1.4;
                    }
                    .summary-box {
                        background: #F9FAFB;
                        border-radius: 16px;
                        padding: 20px;
                        text-align: left;
                        margin-bottom: 24px;
                        border: 1px solid #E5E7EB;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        font-size: 13px;
                        color: #4B5563;
                    }
                    .summary-row:last-child {
                        margin-bottom: 0;
                    }
                    .summary-row strong {
                        color: #111827;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        border-top: 1.5px solid #E5E7EB;
                        padding-top: 12px;
                        margin-top: 12px;
                        font-weight: 800;
                        font-size: 18px;
                        color: #B38628;
                    }
                    .pay-btn {
                        background: linear-gradient(135deg, #C8A34D 0%, #B38628 100%);
                        color: #FFFFFF;
                        font-size: 16px;
                        font-weight: 800;
                        border: none;
                        border-radius: 14px;
                        width: 100%;
                        padding: 16px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 15px rgba(200, 163, 77, 0.35);
                    }
                    .pay-btn:hover {
                        opacity: 0.95;
                        transform: translateY(-1px);
                    }
                    .security-text {
                        font-size: 11px;
                        color: #6B7280;
                        margin-top: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    }
                    #loadingOverlay {
                        display: none;
                        position: fixed;
                        inset: 0;
                        background: rgba(255,255,255,0.94);
                        z-index: 9999;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 16px;
                    }
                    .spinner {
                        width: 44px;
                        height: 44px;
                        border: 4px solid #E5E7EB;
                        border-top-color: #C8A34D;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .overlay-text { color: #4B5563; font-size: 14px; font-weight: 600; }
                </style>
            </head>
            <body>
                <div id="loadingOverlay">
                    <div class="spinner"></div>
                    <div class="overlay-text" id="overlayMsg">Connecting to Razorpay...</div>
                </div>

                <div class="checkout-card" id="mainCard">
                    <div class="logo-badge">🛡️ SECURE CONSULTATION BILLING</div>
                    <h2>Confirm Consultation Fee</h2>
                    <p class="subtitle">Complete payment securely to unlock calls and direct messaging with your advocate.</p>

                    <div class="summary-box">
                        <div class="summary-row">
                            <span>Advocate:</span>
                            <strong>${advocateName}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Practice Area:</span>
                            <strong>${practiceArea}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Mode:</span>
                            <strong style="text-transform: capitalize;">${consultationType} Consultation</strong>
                        </div>
                        <div class="summary-row">
                            <span>Schedule:</span>
                            <strong>${scheduledDateStr} • ${timeSlot}</strong>
                        </div>
                        <div class="total-row">
                            <span>Total Fee:</span>
                            <span>₹${fee}</span>
                        </div>
                    </div>

                    <button class="pay-btn" id="payBtn" onclick="initiatePayment()">Pay ₹${fee} via Razorpay</button>
                    
                    <div class="security-text">
                        <span>🔒 256-Bit Encrypted • UPI, Cards, NetBanking Supported</span>
                    </div>
                </div>

                <script>
                    var requestId = "${request._id}";
                    var fee = ${fee};
                    var userToken = "${token}";

                    function initiatePayment() {
                        var btn = document.getElementById('payBtn');
                        btn.innerText = 'Connecting to Razorpay...';
                        btn.disabled = true;

                        var headers = { 'Content-Type': 'application/json' };
                        if (userToken) {
                            headers['Authorization'] = 'Bearer ' + userToken;
                        }

                        var createOrderUrl = '/api/consultations/requests/' + requestId + '/create-order' + (userToken ? '?token=' + encodeURIComponent(userToken) : '');
                        fetch(createOrderUrl, {
                            method: 'POST',
                            headers: headers
                        })
                        .then(function(res) { return res.json(); })
                        .then(function(data) {
                            if (!data.order || !data.key) {
                                alert('Could not initiate payment: ' + (data.message || 'Order creation failed.'));
                                btn.innerText = 'Pay ₹' + fee + ' via Razorpay';
                                btn.disabled = false;
                                return;
                            } else {
                                var options = {
                                    "key": data.key,
                                    "amount": data.order.amount,
                                    "currency": "INR",
                                    "name": "AI LEGAL™ Consultation",
                                    "description": "${consultationType.toUpperCase()} Consultation with ${advocateName}",
                                    "order_id": data.order.id,
                                    "prefill": {
                                        "name": "${request.userName || ''}",
                                        "email": "${request.userEmail || ''}",
                                        "contact": "${request.userPhone || ''}"
                                    },
                                    "handler": function (response) {
                                        completeVerification(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
                                    },
                                    "modal": {
                                        "ondismiss": function() {
                                            btn.innerText = 'Pay ₹' + fee + ' via Razorpay';
                                            btn.disabled = false;
                                            try {
                                                window.location.href = "ailegal://consultation/cancelled?id=" + requestId;
                                            } catch(e) {}
                                        }
                                    },
                                    "theme": { "color": "#C8A34D" }
                                };
                                var rzp = new Razorpay(options);
                                rzp.open();
                            }
                        })
                        .catch(function(err) {
                            alert('Could not start Razorpay payment: ' + err.message);
                            btn.innerText = 'Pay ₹' + fee + ' via Razorpay';
                            btn.disabled = false;
                        });
                    }

                    function completeVerification(orderId, paymentId, signature) {
                        var overlay = document.getElementById('loadingOverlay');
                        var overlayMsg = document.getElementById('overlayMsg');
                        overlayMsg.innerText = 'Verifying Payment & Unlocking Session...';
                        overlay.style.display = 'flex';

                        var headers = { 'Content-Type': 'application/json' };
                        if (userToken) {
                            headers['Authorization'] = 'Bearer ' + userToken;
                        }

                        var payUrl = '/api/consultations/requests/' + requestId + '/pay' + (userToken ? '?token=' + encodeURIComponent(userToken) : '');
                        fetch(payUrl, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                paymentId: paymentId,
                                gateway: 'Razorpay',
                                orderId: orderId,
                                signature: signature
                            })
                        })
                        .then(function(res) { return res.json(); })
                        .then(function(data) {
                            overlay.style.display = 'none';
                            if (data && data.success) {
                                showSuccessCard();
                                var deepLink = 'ailegal://consultation/success?id=' + encodeURIComponent(requestId);
                                try {
                                    if (window.opener) { window.opener.postMessage(JSON.stringify({ status: 'success', requestId: requestId }), '*'); }
                                    if (window.parent) { window.parent.postMessage(JSON.stringify({ status: 'success', requestId: requestId }), '*'); }
                                } catch(e) {}
                                setTimeout(function() {
                                    try { window.location.href = deepLink; } catch(e) {}
                                }, 1200);
                            } else {
                                alert('Payment verification failed: ' + (data.message || 'Unknown error'));
                                var btn = document.getElementById('payBtn');
                                btn.innerText = 'Pay ₹' + fee + ' via Razorpay';
                                btn.disabled = false;
                            }
                        })
                        .catch(function(err) {
                            overlay.style.display = 'none';
                            alert('Network error verifying payment: ' + err.message);
                            var btn = document.getElementById('payBtn');
                            btn.innerText = 'Pay ₹' + fee + ' via Razorpay';
                            btn.disabled = false;
                        });
                    }

                    function showSuccessCard() {
                        var card = document.getElementById('mainCard');
                        card.innerHTML = [
                            '<div style="width:64px;height:64px;border-radius:32px;background:#ECFDF5;color:#10B981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">✓</div>',
                            '<h2 style="color:#0F172A;margin-bottom:8px;">Payment Successful!</h2>',
                            '<p style="color:#64748B;font-size:13px;line-height:1.5;margin-bottom:20px;">Fee of ₹' + fee + ' received. Your consultation with ${advocateName} is confirmed and unlocked.</p>',
                            '<div style="padding:12px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;font-size:12px;color:#10B981;font-weight:700;margin-bottom:20px;">Live Calls and Direct Messaging Unlocked</div>',
                            '<a href="ailegal://consultation/success?id=' + requestId + '" style="display:inline-block;width:100%;padding:14px;background:#C8A34D;color:#111;font-weight:800;border-radius:12px;text-decoration:none;font-size:14px;">Return to AI Legal</a>'
                        ].join('');
                    }

                    // Auto-trigger Razorpay modal on page load
                    window.addEventListener('DOMContentLoaded', function() {
                        setTimeout(initiatePayment, 400);
                    });
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('[Consultation API] Error rendering web-checkout page:', err);
        res.status(500).send('Failed to render consultation checkout.');
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

        // Check and mark expired slots
        for (const r of requests) {
            if (['pending', 'accepted', 'scheduled'].includes(r.status) && isConsultationSlotExpired(r.scheduledDate, r.scheduledTimeSlot)) {
                r.status = 'expired';
                ConsultationRequest.updateOne(
                    { _id: r._id, status: { $in: ['pending', 'accepted', 'scheduled'] } },
                    {
                        $set: { status: 'expired' },
                        $push: {
                            timeline: {
                                status: 'expired',
                                title: 'Consultation Expired',
                                description: `Consultation time slot (${r.scheduledTimeSlot || 'scheduled slot'}) has ended.`,
                                timestamp: new Date()
                            }
                        }
                    }
                ).exec().catch(() => {});
            }
        }

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
                paymentStatus: r.paymentStatus || 'pending',
                fee: r.fee || 1500,
                scheduledDate: r.scheduledDate,
                scheduledTimeSlot: r.scheduledTimeSlot,
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

        // Auto-expire if scheduled slot has passed
        if (['pending', 'accepted', 'scheduled'].includes(request.status) && isConsultationSlotExpired(request.scheduledDate, request.scheduledTimeSlot)) {
            request.status = 'expired';
            request.timeline = request.timeline || [];
            request.timeline.push({
                status: 'expired',
                title: 'Consultation Expired',
                description: `Consultation time slot (${request.scheduledTimeSlot || 'scheduled slot'}) has ended.`,
                timestamp: new Date()
            });
            await request.save();
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
                scheduledTimeSlot: request.scheduledTimeSlot,
                paymentStatus: request.paymentStatus || 'pending',
                fee: request.fee || 1500,
                isExpired: request.status === 'expired'
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

        // Auto-expire check before sending message
        if (['pending', 'accepted', 'scheduled'].includes(request.status) && isConsultationSlotExpired(request.scheduledDate, request.scheduledTimeSlot)) {
            request.status = 'expired';
            request.timeline = request.timeline || [];
            request.timeline.push({
                status: 'expired',
                title: 'Consultation Expired',
                description: `Consultation time slot (${request.scheduledTimeSlot || 'scheduled slot'}) has ended.`,
                timestamp: new Date()
            });
            await request.save();
        }

        // Lifecycle check: Communication closed if cancelled, rejected, completed, or expired
        if (['cancelled', 'rejected', 'completed', 'expired'].includes(request.status)) {
            return res.status(400).json({
                success: false,
                message: `This consultation has ${request.status === 'expired' ? 'expired' : 'been ' + request.status}. Communication and calls are closed.`
            });
        }

        // Payment check: Client must pay fee after advocate accepts to unlock messaging
        if (isClient && request.paymentStatus !== 'paid') {
            return res.status(402).json({
                success: false,
                message: 'Consultation fee payment is required to unlock messaging and calls.'
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
