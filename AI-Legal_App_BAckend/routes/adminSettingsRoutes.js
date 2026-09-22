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
            subject: 'SMTP Connection Test Success - AI LEGAL™',
            text: 'This is a successful SMTP connection test from your AI Legal™ Admin Portal.',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                    <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                        <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                        <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                            AI LEGAL<span style="color: #C8A34D;">™</span>
                        </h1>
                        <div style="color: #15803D; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                            SMTP Configuration Test
                        </div>
                    </div>
                    <div style="padding: 28px 24px; background: #FFFFFF;">
                        <div style="display: inline-block; padding: 4px 14px; background: #DCFCE7; border: 1px solid #86EFAC; color: #15803D; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px;">
                            ✓ Connection Verified
                        </div>
                        <h2 style="color: #0F172A; margin: 0 0 12px 0; font-size: 18px;">SMTP Configuration Operational</h2>
                        <p style="color: #334155; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">Your custom SMTP mail server parameters have been successfully tested and verified operational for AI LEGAL™.</p>
                        <div style="background: #F8FAFC; padding: 14px 18px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">
                            Host: <strong style="color: #0F172A;">${host}</strong> &bull; Port: <strong style="color: #0F172A;">${port}</strong> &bull; User: <strong style="color: #0F172A;">${user}</strong>
                        </div>
                    </div>
                    <div style="background: #F8FAFC; padding: 16px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                        <p style="margin: 0;">AI LEGAL™ Platform • Admin Test Dispatch</p>
                    </div>
                </div>
            `
        });

        res.status(200).json({ success: true, message: 'Test email sent successfully!', messageId: info.messageId });
    } catch (error) {
        res.status(500).json({ success: false, message: `SMTP connection failed: ${error.message}` });
    }
});

export default router;
