import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authorization.js';
import User from '../models/User.js';
import AdminSettings from '../models/AdminSettings.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// GET settings
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        let settings = await AdminSettings.findOne({});
        if (!settings) {
            settings = await AdminSettings.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update settings
router.put('/', verifyToken, isAdmin, async (req, res) => {
    try {
        let settings = await AdminSettings.findOne({});
        if (!settings) {
            settings = await AdminSettings.create(req.body);
        } else {
            settings = await AdminSettings.findByIdAndUpdate(settings._id, req.body, { new: true });
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST test SMTP email
router.post('/send-test-mail', verifyToken, isAdmin, async (req, res) => {
    try {
        const { host, port, user, pass, toEmail } = req.body;
        if (!host || !port || !user || !pass || !toEmail) {
            return res.status(400).json({ success: false, message: 'Missing SMTP parameters or recipient email.' });
        }

        const transporter = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: {
                user,
                pass
            }
        });

        const info = await transporter.sendMail({
            from: `"AI Legal™ Support" <${user}>`,
            to: toEmail,
            subject: 'SMTP Connection Test Success',
            text: 'This is a successful SMTP connection test from your AI Legal™ Admin Portal Upgrade.',
            html: '<h3>SMTP Configuration Success</h3><p>Your SMTP mail configurations are verified and operational.</p>'
        });

        res.status(200).json({ success: true, message: 'Test email sent successfully!', messageId: info.messageId });
    } catch (error) {
        res.status(500).json({ success: false, message: `SMTP connection failed: ${error.message}` });
    }
});

export default router;
