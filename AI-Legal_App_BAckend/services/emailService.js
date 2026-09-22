import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: (process.env.EMAIL_HOST_USER || process.env.EMAIL || process.env.EMAIL_USER || 'admin@uwo24.com').trim(),
    password: (process.env.EMAIL_HOST_PASSWORD || process.env.EMAIL_PASSWORD || 'tasj erpk zgpx hgfn').trim(),
    adminEmail: process.env.ADMIN_EMAIL || 'admin@uwo24.com'
};

const LOGO_URL = 'https://ailegal.aisa24.com/logo-transparent.png';

// Create transporter
const createTransporter = () => {
    try {
        if (process.env.EMAIL_HOST_USER && process.env.EMAIL_HOST_PASSWORD) {
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_HOST_USER.trim(),
                    pass: process.env.EMAIL_HOST_PASSWORD.trim()
                }
            });
        }

        if (process.env.RESEND_API_KEY) {
            return nodemailer.createTransport({
                host: "smtp.resend.com",
                port: 465,
                secure: true,
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY.trim()
                }
            });
        }

        return nodemailer.createTransport({
            service: EMAIL_CONFIG.service,
            auth: {
                user: EMAIL_CONFIG.user,
                pass: EMAIL_CONFIG.password
            }
        });
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to create transporter:', error);
        return null;
    }
};

// Send email notification to admin when user/vendor submits ticket
export const sendAdminNotification = async (ticket) => {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
    }

    const ticketType = ticket.issueType || ticket.type || 'Technical Support';
    const ticketName = ticket.name || (ticket.userId && ticket.userId.name) || 'Anonymous';
    const ticketEmail = ticket.email || (ticket.userId && ticket.userId.email) || 'No email provided';
    const ticketDescription = ticket.message || ticket.description || 'No description provided';
    const ticketId = ticket._id ? ticket._id.toString() : 'NEW';
    const ticketRef = ticketId.length >= 24 ? ticketId.substring(18).toUpperCase() : ticketId;

    const mailOptions = {
        from: EMAIL_CONFIG.user,
        to: EMAIL_CONFIG.adminEmail,
        subject: `🎫 New Support Ticket [${ticketType}] - #${ticketRef}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                        Support Ticket Dispatch
                    </div>
                </div>
                
                <div style="padding: 30px; background: #FFFFFF;">
                    <h2 style="color: #0F172A; margin-top: 0; font-size: 20px; font-weight: 800;">Ticket Details</h2>
                    
                    <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #E2E8F0;">
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Ticket ID:</strong> <span style="color: #0F172A; font-weight: 700;">#${ticketRef}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Type:</strong> <span style="color: #0F172A;">${ticketType}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">User:</strong> <span style="color: #0F172A;">${ticketName}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Email:</strong> <span style="color: #0F172A;">${ticketEmail}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Status:</strong> <span style="padding: 4px 12px; background: #FEF3C7; color: #92400E; border-radius: 20px; font-size: 11px; font-weight: 800;">${(ticket.status || 'pending').toUpperCase()}</span></p>
                        ${ticket.whyNeeded ? `<p style="margin: 8px 0;"><strong style="color: #64748B;">Why Needed:</strong> <span style="color: #0F172A;">${ticket.whyNeeded}</span></p>` : ''}
                        ${ticket.whoBenefit ? `<p style="margin: 8px 0;"><strong style="color: #64748B;">Who Benefits:</strong> <span style="color: #0F172A;">${ticket.whoBenefit}</span></p>` : ''}
                    </div>
                    
                    <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; border: 1px solid #E2E8F0;">
                        <h3 style="color: #0F172A; margin-top: 0; font-size: 15px;">Description / Message:</h3>
                        <p style="color: #334155; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0;">${ticketDescription}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.DASHBOARD_URL || 'https://ailegal.aisa24.com'}/admin" style="display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 14px; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">View in Admin Dashboard</a>
                    </div>
                </div>
                
                <div style="background: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0; font-weight: 700;">AI LEGAL™ Platform • Admin Notifications</p>
                    <p style="margin: 4px 0 0 0; color: #94A3B8;">This is an automated notification. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('[EMAIL SERVICE] Admin notification sent successfully');
        return { success: true, message: 'Email sent to admin' };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send admin notification:', error);
        return { success: false, message: error.message };
    }
};

// Send reply from admin to vendor
export const sendVendorReply = async (vendorEmail, vendorName, message, ticketId) => {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
        from: EMAIL_CONFIG.user,
        to: vendorEmail,
        subject: `✉️ Reply from AI LEGAL™ Admin - Ticket #${ticketId.substring(18).toUpperCase()}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                        Support Response
                    </div>
                </div>
                
                <div style="padding: 30px; background: #FFFFFF;">
                    <h2 style="color: #0F172A; margin-top: 0; font-size: 20px;">Hello ${vendorName},</h2>
                    <p style="color: #475569; margin-bottom: 20px; font-size: 15px; line-height: 1.6;">Our support team has responded to your support ticket.</p>
                    
                    <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #E2E8F0;">
                        <p style="margin: 0 0 10px 0;"><strong style="color: #64748B;">Ticket ID:</strong> <span style="color: #0F172A; font-weight: 700;">#${ticketId.substring(18).toUpperCase()}</span></p>
                        <div style="border-top: 1px solid #E2E8F0; margin: 15px 0; padding-top: 15px;">
                            <h3 style="color: #0F172A; margin-top: 0; font-size: 15px;">Admin's Response:</h3>
                            <p style="color: #1E293B; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0;">${message}</p>
                        </div>
                    </div>
                    
                    <div style="background: #FFFDF5; padding: 16px; border-radius: 8px; border: 1px solid #FEF08A; border-left: 4px solid #C8A34D;">
                        <p style="margin: 0; color: #854D0E; font-size: 14px;"><strong>Need more help?</strong> Feel free to submit another support ticket from your dashboard.</p>
                    </div>
                </div>
                
                <div style="background: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0; font-weight: 700;">AI LEGAL™ Platform</p>
                    <p style="margin: 4px 0 0 0; color: #94A3B8;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('[EMAIL SERVICE] Vendor reply sent successfully to:', vendorEmail);
        return { success: true, message: 'Email sent to vendor' };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send vendor reply:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Send feedback notification to admin
 */
export const sendFeedbackAdminNotification = async (feedback) => {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
        from: EMAIL_CONFIG.user,
        to: EMAIL_CONFIG.adminEmail,
        subject: `📢 New User Feedback - ${feedback.type === 'thumbs_up' ? 'Positive' : 'Negative'}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                        User Feedback Notification
                    </div>
                </div>
                
                <div style="padding: 30px; background: #FFFFFF;">
                    <div style="display: inline-block; padding: 4px 14px; background: ${feedback.type === 'thumbs_up' ? '#DCFCE7' : '#FEE2E2'}; border: 1px solid ${feedback.type === 'thumbs_up' ? '#86EFAC' : '#FCA5A5'}; color: ${feedback.type === 'thumbs_up' ? '#15803D' : '#DC2626'}; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px;">
                        ${feedback.type === 'thumbs_up' ? '👍 Positive Feedback' : '👎 Negative Feedback'}
                    </div>

                    <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #E2E8F0;">
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Type:</strong> <span style="color: #0F172A; font-weight: bold;">${feedback.type === 'thumbs_up' ? '👍 Thumbs Up' : '👎 Thumbs Down'}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Session ID:</strong> <span style="color: #0F172A;">${feedback.sessionId}</span></p>
                        <p style="margin: 8px 0;"><strong style="color: #64748B;">Message ID:</strong> <span style="color: #0F172A;">${feedback.messageId}</span></p>
                    </div>
                    
                    ${feedback.categories && feedback.categories.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #64748B; font-size: 14px;">Categories:</strong>
                            <div style="margin-top: 8px;">
                                ${feedback.categories.map(cat => `<span style="display: inline-block; background: #E2E8F0; color: #475569; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-right: 5px; margin-bottom: 5px;">${cat}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; border: 1px solid #E2E8F0;">
                        <h3 style="color: #0F172A; margin-top: 0; font-size: 15px;">Details:</h3>
                        <p style="color: #334155; line-height: 1.6; margin-bottom: 0;">${feedback.details || 'No details provided'}</p>
                    </div>
                </div>
                
                <div style="background: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0; font-weight: 700;">AI LEGAL™ Platform • Feedback System</p>
                    <p style="margin: 4px 0 0 0; color: #94A3B8;">This is an automated notification.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Feedback notification sent successfully to ${EMAIL_CONFIG.adminEmail}`);
        return { success: true, message: 'Email sent to admin' };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send feedback email:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Send AI Response Complaint notification email to admin@uwo24.com
 */
export const sendComplaintEmail = async (complaint) => {
    const transporter = createTransporter();
    const adminRecipient = 'admin@uwo24.com';

    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping complaint email');
        return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
        from: `"AI Legal Admin" <${EMAIL_CONFIG.user}>`,
        to: adminRecipient,
        subject: `AI Response Complaint - [${complaint.category}]`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #DC2626; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 6px;">
                        ⚠️ AI Response Complaint / Feedback Report
                    </div>
                </div>

                <div style="padding: 24px; background: #FFFFFF;">
                    <div style="background: #F8FAFC; padding: 16px; border-radius: 10px; border-left: 4px solid #C8A34D; border: 1px solid #E2E8F0; margin-bottom: 20px;">
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">Complaint ID:</strong> <span style="color: #0F172A; font-weight: bold;">${complaint.complaintId}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">Category:</strong> <span style="display: inline-block; background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;">${complaint.category}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">Timestamp:</strong> <span style="color: #0F172A;">${new Date(complaint.timestamp).toLocaleString()}</span></p>
                    </div>

                    <h3 style="color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-top: 24px; font-size: 16px;">👤 User Details</h3>
                    <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #E2E8F0;">
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">User Name:</strong> <span style="color: #0F172A;">${complaint.userName}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">User Email:</strong> <span style="color: #0F172A;">${complaint.userEmail}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">Workspace:</strong> <span style="color: #0F172A;">${complaint.workspace}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">Plan:</strong> <span style="color: #0F172A;">${complaint.subscriptionPlan}</span></p>
                        <p style="margin: 6px 0;"><strong style="color: #64748B;">AI Tool:</strong> <span style="color: #0F172A;">${complaint.aiTool}</span></p>
                    </div>

                    ${complaint.comment ? `
                        <h3 style="color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; font-size: 16px;">💬 Optional Comments</h3>
                        <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 16px; border-radius: 8px; margin-bottom: 20px; color: #92400E; font-size: 14px; white-space: pre-wrap;">
                            ${complaint.comment}
                        </div>
                    ` : ''}

                    <h3 style="color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; font-size: 16px;">❓ Original User Prompt</h3>
                    <div style="background: #F1F5F9; padding: 16px; border-radius: 8px; margin-bottom: 20px; color: #334155; font-size: 14px; white-space: pre-wrap; border: 1px solid #E2E8F0;">
                        ${complaint.originalPrompt || 'No prompt content logged'}
                    </div>

                    <h3 style="color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; font-size: 16px;">🤖 Complete AI Response</h3>
                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; margin-bottom: 20px; color: #334155; font-size: 13px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;">
                        ${complaint.aiResponse || 'No response content logged'}
                    </div>

                    <h3 style="color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; font-size: 16px;">📱 Device & System Info</h3>
                    <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid #E2E8F0;">
                        <p style="margin: 4px 0;"><strong style="color: #64748B;">Device Info:</strong> ${complaint.deviceInfo}</p>
                        <p style="margin: 4px 0;"><strong style="color: #64748B;">OS Version:</strong> ${complaint.osVersion}</p>
                        <p style="margin: 4px 0;"><strong style="color: #64748B;">App Version:</strong> ${complaint.appVersion}</p>
                        <p style="margin: 4px 0;"><strong style="color: #64748B;">Language:</strong> ${complaint.language}</p>
                    </div>
                </div>

                <div style="background: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0; color: #B48628; font-weight: bold;">AI LEGAL™ Complaint Management System</p>
                    <p style="margin: 4px 0 0 0; color: #94A3B8;">Sent directly to admin@uwo24.com</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] Complaint email sent successfully to ${adminRecipient}`);
        return { success: true, message: 'Complaint email sent' };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send complaint email:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Send AI CashFlow Report to user
 */
export const sendCashFlowReport = async (userEmail, userName, stockData, analysis, news) => {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
    }

    const newsHtml = (news || []).map(n => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #E2E8F0;">
            <a href="${n.url}" style="color: #B48628; text-decoration: none; font-weight: bold; font-size: 15px;">${n.title}</a>
            <p style="margin: 5px 0; color: #64748B; font-size: 13.5px; line-height: 1.5;">${n.summary}</p>
            <span style="font-size: 11px; color: #94A3B8;">Source: ${n.source} | Sentiment: ${n.overall_sentiment_label}</span>
        </div>
    `).join('');

    const mailOptions = {
        from: EMAIL_CONFIG.user,
        to: userEmail,
        subject: `📈 AI CashFlow Report – ${stockData.symbol}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 20px auto; background: #FFFFFF; color: #1E293B; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #B48628; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                        AI CashFlow Report
                    </div>
                </div>

                <div style="padding: 30px; background: #FFFFFF;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #F1F5F9; padding-bottom: 20px;">
                        <div>
                            <h2 style="margin: 0; color: #0F172A; font-size: 24px;">${stockData.symbol}</h2>
                            <p style="margin: 5px 0; color: #64748B; font-weight: 500;">Real-time Market Data</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 32px; font-weight: bold; color: #0F172A;">$${stockData.price}</div>
                            <div style="color: ${stockData.change.startsWith('-') ? '#DC2626' : '#16A34A'}; font-weight: bold;">
                                ${stockData.change} (${stockData.changePercent})
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                        <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                            <p style="margin: 0; color: #64748B; font-size: 13px; text-transform: uppercase;">Day High</p>
                            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #0F172A;">$${stockData.high}</p>
                        </div>
                        <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                            <p style="margin: 0; color: #64748B; font-size: 13px; text-transform: uppercase;">Day Low</p>
                            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #0F172A;">$${stockData.low}</p>
                        </div>
                        <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                            <p style="margin: 0; color: #64748B; font-size: 13px; text-transform: uppercase;">Volume</p>
                            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #0F172A;">${Number(stockData.volume).toLocaleString()}</p>
                        </div>
                        <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0;">
                            <p style="margin: 0; color: #64748B; font-size: 13px; text-transform: uppercase;">Prev Close</p>
                            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #0F172A;">$${stockData.previousClose}</p>
                        </div>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="border-left: 4px solid #C8A34D; padding-left: 15px; color: #0F172A; margin-bottom: 20px;">AI Analysis &amp; Insights</h3>
                        <div style="background: #FFFDF5; border: 1px solid #FEF08A; padding: 25px; border-radius: 12px; line-height: 1.6; color: #1E293B; white-space: pre-wrap;">${analysis}</div>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="border-left: 4px solid #C8A34D; padding-left: 15px; color: #0F172A; margin-bottom: 20px;">Correlated News Feed</h3>
                        ${newsHtml || '<p style="color: #94A3B8;">No recent news available for this ticker.</p>'}
                    </div>

                    <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 20px; border-radius: 8px; margin-top: 40px;">
                        <h4 style="margin: 0 0 10px; color: #92400E; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Financial Disclaimer</h4>
                        <p style="margin: 0; color: #78350F; font-size: 13px; line-height: 1.5;">
                            This report is generated for informational purposes only using AI analysis and market data. 
                            <strong>It does not constitute financial advice, investment recommendations, or a solicitation to buy/sell any securities.</strong> 
                            Always consult with a qualified financial advisor before making any investment decisions.
                        </p>
                    </div>

                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} AI LEGAL™ Intelligence Platform. All rights reserved.</p>
                        <p style="margin: 5px 0 0; color: #94A3B8;">This report was requested by ${userName} (${userEmail}).</p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SERVICE] CashFlow report sent to ${userEmail}`);
        return { success: true, message: 'Report sent successfully' };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send CashFlow report:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Send Shared Chat Link Email
 */
export const sendShareLinkEmail = async (targetEmail, shareLink, sessionTitle, senderName = "A user") => {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('[EMAIL SERVICE] Transporter not configured, skipping email');
        return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
        from: EMAIL_CONFIG.user,
        to: targetEmail,
        subject: `🔗 Shared AI LEGAL™ Chat: ${sessionTitle}`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);">
                <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                        Conversation Shared With You
                    </div>
                </div>

                <div style="padding: 36px 30px; text-align: center; background: #FFFFFF;">
                    <div style="width: 60px; height: 60px; background: #FFFDF5; border: 1px solid #FEF08A; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <span style="font-size: 28px;">💬</span>
                    </div>
                    
                    <h2 style="color: #0F172A; margin: 0 0 12px; font-size: 20px; font-weight: 800;">${sessionTitle}</h2>
                    <p style="color: #475569; margin: 0 0 28px; line-height: 1.6; font-size: 15px;">
                        ${senderName} has shared an AI conversation with you on AI LEGAL™. Click the button below to view the full chat history.
                    </p>

                    <a href="${shareLink}" style="display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; padding: 15px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">View Conversation &rarr;</a>
                    
                    <div style="margin-top: 30px; padding-top: 24px; border-top: 1px solid #F1F5F9;">
                        <p style="color: #64748B; font-size: 13px; margin: 0;">
                            Don't have an account? <a href="https://ailegal.aisa24.com" style="color: #B48628; text-decoration: underline; font-weight: 700;">Get started with AI LEGAL™</a>
                        </p>
                    </div>
                </div>

                <div style="background: #F8FAFC; padding: 18px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0; font-weight: 700;">&copy; ${new Date().getFullYear()} AI LEGAL™ Intelligence Platform</p>
                    <p style="margin: 4px 0 0; color: #94A3B8;">This is an automated share notification based on a user request.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send share link:', error);
        return { success: false, error: error.message };
    }
};

// Send Public Contact Query Email to admin@uwo24.com
export const sendPublicContactQueryEmail = async (queryData) => {
    const { firstName, lastName, email, contactNo, pinCode, country, description } = queryData;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Prospective Advocate';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@uwo24.com';
    const emailSubject = `⚖️ New Query Received from ${fullName} (${country || 'India'})`;

    const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 20px auto; padding: 0; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; background-color: #FFFFFF; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
            <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
                    New Public Legal Inquiry &amp; Query
                </div>
            </div>
            
            <div style="padding: 28px 24px;">
                <p style="color: #475569; font-size: 14.5px; margin-top: 0; line-height: 1.6;">
                    A prospective user / legal professional has submitted an inquiry via the <strong>AI LEGAL™</strong> homepage.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600; width: 35%;">Full Name:</td>
                        <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; font-weight: 700;">${fullName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600;">Email Address:</td>
                        <td style="padding: 12px 16px; font-size: 14px; color: #B48628; font-weight: 600;"><a href="mailto:${email}" style="color: #B48628; text-decoration: underline;">${email}</a></td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600;">Contact Number:</td>
                        <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; font-weight: 600;">${contactNo || 'Not Provided'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600;">Country:</td>
                        <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; font-weight: 600;">${country || 'India'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600;">PIN Code:</td>
                        <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; font-weight: 600;">${pinCode || 'Not Provided'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #64748B; font-weight: 600;">Submitted At:</td>
                        <td style="padding: 12px 16px; font-size: 12px; color: #64748B;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td>
                    </tr>
                </table>
                
                <div style="margin-top: 20px; padding: 18px; background: #FFFDF5; border: 1px solid #FDE68A; border-left: 4px solid #C8A34D; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #854D0E; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Query / Message:</h4>
                    <p style="margin: 0; color: #1E293B; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description || 'No specific message provided. User requested a direct callback / inquiry.'}</p>
                </div>
                
                <div style="margin-top: 24px; text-align: center;">
                    <a href="mailto:${email}?subject=Re:%20Inquiry%20regarding%20AI%20LEGAL%E2%84%A2%20Workspace" style="display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A; padding: 13px 30px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 14px; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">Reply Directly to ${firstName || fullName}</a>
                </div>
            </div>
            
            <div style="padding: 16px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 11px; background: #F8FAFC;">
                AI LEGAL™ Automated Dispatch • Forwarded to admin@uwo24.com
            </div>
        </div>
    `;

    // 1. Try Resend first
    try {
        if (process.env.RESEND_API_KEY) {
            const { resend } = await import('../utils/Email.config.js');
            if (resend && resend.emails && typeof resend.emails.send === 'function') {
                const resendResult = await resend.emails.send({
                    from: `AI LEGAL™ Queries <${process.env.EMAIL || 'verification@ai-mall.in'}>`,
                    to: [adminEmail],
                    subject: emailSubject,
                    html: htmlContent
                });
                console.log('[PUBLIC QUERY] Email dispatched via Resend:', resendResult);
                return { success: true, provider: 'resend' };
            }
        }
    } catch (resendErr) {
        console.warn('[PUBLIC QUERY] Resend attempt warning:', resendErr.message);
    }

    // 2. Fallback to Nodemailer transporter
    const transporter = createTransporter();
    if (transporter) {
        try {
            const mailOptions = {
                from: `AI LEGAL™ <${EMAIL_CONFIG.user}>`,
                to: adminEmail,
                subject: emailSubject,
                html: htmlContent
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('[PUBLIC QUERY] Email dispatched via Nodemailer:', info?.messageId);
            return { success: true, provider: 'nodemailer' };
        } catch (nodemailerErr) {
            console.error('[PUBLIC QUERY] Nodemailer failed:', nodemailerErr);
            throw nodemailerErr;
        }
    }

    return { success: true, message: 'Logged query without live transporter' };
};

export const sendAdvocateInvitationEmail = async ({ invitedEmail, invitedName, inviteUrl, expiresAt }) => {
    const formattedExpires = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '7 days';
    const emailSubject = "You're Invited to Join AI Legal™ as a Verified Advocate";
    const displayName = invitedName ? invitedName : 'Counsel';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Join AI Legal™ as a Verified Advocate</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #334155; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #FFFFFF !important; border-radius: 16px; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); }
            .header { padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF; }
            .logo-img { width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0; }
            .logo-title { font-size: 26px; font-weight: 900; letter-spacing: 0.02em; color: #0F172A; margin: 6px 0 0 0; }
            .badge { display: inline-block; margin-top: 8px; padding: 4px 14px; background: #FFFDF5; border: 1px solid #E5C268; border-radius: 20px; font-size: 11px; font-weight: 800; color: #B48628; text-transform: uppercase; letter-spacing: 0.15em; }
            .content { padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.65; background-color: #FFFFFF; }
            .salutation { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px; }
            .quote-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; padding: 18px 20px; margin: 24px 0; border-radius: 0 10px 10px 0; font-style: italic; color: #334155; font-size: 14.5px; line-height: 1.6; }
            .benefits { margin: 18px 0 24px; padding: 0; list-style: none; }
            .benefits li { padding: 8px 0; color: #334155; font-size: 14.5px; display: flex; align-items: center; }
            .check { color: #C8A34D; font-weight: 900; margin-right: 10px; font-size: 16px; }
            .cta-wrap { text-align: center; margin: 34px 0 22px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; font-weight: 800; font-size: 15px; padding: 16px 36px; border-radius: 12px; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35); }
            .expiry-note { font-size: 12px; color: #64748B; text-align: center; margin-top: 14px; }
            .direct-link { margin-top: 24px; padding: 14px 18px; background: #FFFDF5; border: 1px dashed #C8A34D; border-radius: 10px; font-size: 12px; color: #64748B; word-break: break-all; }
            .footer { padding: 22px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; line-height: 1.6; }
        </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #334155; margin: 0; padding: 0;">
        <div style="padding: 40px 10px;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF !important; border-radius: 16px; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);">
                <div class="header" style="padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
                    <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" class="logo-img" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                    <h1 class="logo-title" style="font-size: 26px; font-weight: 900; letter-spacing: 0.02em; color: #0F172A; margin: 6px 0 0 0;">
                        AI LEGAL<span style="color: #C8A34D;">™</span>
                    </h1>
                    <div class="badge" style="display: inline-block; margin-top: 8px; padding: 4px 14px; background: #FFFDF5; border: 1px solid #E5C268; border-radius: 20px; font-size: 11px; font-weight: 800; color: #B48628; text-transform: uppercase; letter-spacing: 0.15em;">
                        Verified Advocate Network
                    </div>
                </div>
                <div class="content" style="padding: 36px 32px; color: #334155; font-size: 15px; line-height: 1.65; background-color: #FFFFFF;">
                    <div class="salutation" style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px;">Dear ${displayName},</div>
                    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.65;">You have been formally invited to join the <strong style="color: #0F172A;">AI Legal™ Verified Advocate Network</strong>, a professional platform designed to help legal professionals create a verified professional presence and connect with users seeking legal consultation.</p>
                    
                    <div class="quote-box" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; padding: 18px 20px; margin: 24px 0; border-radius: 0 10px 10px 0; font-style: italic; color: #334155; font-size: 14.5px; line-height: 1.6;">
                        "You have been invited to join the AI Legal™ Verified Advocate Network, a professional platform designed to help legal professionals create a verified professional presence and connect with users seeking legal consultation."
                    </div>

                    <p style="margin: 20px 0 12px 0; color: #334155; font-size: 15px; line-height: 1.65;">Accepting this invitation will lead to the <strong style="color: #0F172A;">Advocate Profile &amp; Consultation Consent</strong> process in compliance with professional standards, enabling:</p>

                    <ul class="benefits" style="margin: 18px 0 24px; padding: 0; list-style: none;">
                        <li style="padding: 8px 0; color: #334155; font-size: 14.5px;"><span class="check" style="color: #C8A34D; font-weight: 900; margin-right: 10px; font-size: 16px;">✓</span> Professional discovery in the Verified Advocates directory</li>
                        <li style="padding: 8px 0; color: #334155; font-size: 14.5px;"><span class="check" style="color: #C8A34D; font-weight: 900; margin-right: 10px; font-size: 16px;">✓</span> Direct legal consultation inquiries &amp; client communication</li>
                        <li style="padding: 8px 0; color: #334155; font-size: 14.5px;"><span class="check" style="color: #C8A34D; font-weight: 900; margin-right: 10px; font-size: 16px;">✓</span> Customized practice area, courts &amp; fee presentation</li>
                    </ul>

                    <div class="cta-wrap" style="text-align: center; margin: 34px 0 22px;">
                        <a href="${inviteUrl}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; font-weight: 800; font-size: 15px; padding: 16px 36px; border-radius: 12px; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);" target="_blank">Accept Invitation &amp; Continue &rarr;</a>
                        <div class="expiry-note" style="font-size: 12px; color: #64748B; text-align: center; margin-top: 14px;">This secure single-use invitation link expires on ${formattedExpires}.</div>
                    </div>

                    <div class="direct-link" style="margin-top: 24px; padding: 14px 18px; background: #FFFDF5; border: 1px dashed #C8A34D; border-radius: 10px; font-size: 12px; color: #64748B; word-break: break-all;">
                        <span style="color: #854D0E; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Direct Link:</span>
                        <a href="${inviteUrl}" style="color: #B48628; text-decoration: underline; font-weight: 600;">${inviteUrl}</a>
                    </div>
                </div>
                <div class="footer" style="padding: 22px 24px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; line-height: 1.6;">
                    &copy; ${new Date().getFullYear()} AI LEGAL™ | Unified Web Options (UWO). All rights reserved.<br>
                    <span style="color: #94A3B8;">This invitation is strictly designated for ${invitedEmail}.</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import('resend');
            const resendClient = new Resend(process.env.RESEND_API_KEY.trim());
            const resendResult = await resendClient.emails.send({
                from: `AI LEGAL™ Invitations <${process.env.EMAIL || 'verification@ai-mall.in'}>`,
                to: [invitedEmail],
                subject: emailSubject,
                html: htmlContent
            });
            console.log('[INVITATION EMAIL] Dispatched via Resend:', resendResult);
            return { success: true, provider: 'resend', messageId: resendResult?.data?.id };
        }
    } catch (resendErr) {
        console.warn('[INVITATION EMAIL] Resend warning:', resendErr.message);
    }

    const transporter = createTransporter();
    if (transporter) {
        try {
            const mailOptions = {
                from: `AI LEGAL™ <${EMAIL_CONFIG.user}>`,
                to: invitedEmail,
                subject: emailSubject,
                html: htmlContent
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('[INVITATION EMAIL] Dispatched via Nodemailer:', info?.messageId);
            return { success: true, provider: 'nodemailer', messageId: info?.messageId };
        } catch (nodemailerErr) {
            console.error('[INVITATION EMAIL] Nodemailer error:', nodemailerErr.message);
        }
    }

    return { success: true, message: 'Logged invitation email without active transport' };
};
