/**
 * AI LEGAL™ — Unified Email Templates
 * Pure White Luxury Theme matching AI LEGAL™ Webapp:
 * Pure White Card (#FFFFFF), Dark Slate/Black (#0F172A), Gold (#C8A34D), Warm Gold (#B48628).
 */

const DASHBOARD_URL = 'https://ailegal.aisa24.com/';

export const Verification_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - AI LEGAL™</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background-color: #F1F5F9; line-height: 1.6; }
        .wrapper { width: 100%; padding: 40px 10px; table-layout: fixed; }
        .container { max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; }
        .header { background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9; }
        .content { padding: 36px 32px; color: #1E293B; }
        .greeting { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
        .verification-code { display: block; margin: 24px 0; font-size: 34px; color: #0F172A; background: #FFFDF5; border: 2px dashed #C8A34D; padding: 18px 24px; text-align: center; border-radius: 12px; font-weight: 900; letter-spacing: 6px; font-family: 'Courier New', monospace; }
        .info-text { font-size: 15px; color: #334155; margin: 15px 0; line-height: 1.65; }
        .expiry-notice { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 6px; font-size: 13px; color: #92400E; font-weight: 600; }
        .security-note { margin-top: 25px; padding: 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #64748B; line-height: 1.6; }
        .footer { background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6; }
        .footer a { color: #B48628; text-decoration: none; font-weight: 700; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif;">
    <div style="padding: 40px 10px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D;">
            <div class="header" style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px;">
                    Legal Intelligence Platform
                </div>
            </div>
            <div class="content" style="padding: 36px 32px; color: #1E293B;">
                <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">🔐 Verify Your Email Address</h2>
                <p class="greeting" style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 16px;">Hello {name},</p>
                <p class="info-text" style="font-size: 15px; color: #334155; margin: 15px 0; line-height: 1.65;">
                    Thank you for joining AI LEGAL™. To complete your registration and secure your legal intelligence workspace, please enter the verification code below:
                </p>
                <span class="verification-code" style="display: block; margin: 24px 0; font-size: 34px; color: #0F172A; background: #FFFDF5; border: 2px dashed #C8A34D; padding: 18px 24px; text-align: center; border-radius: 12px; font-weight: 900; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                    {verificationCode}
                </span>
                <div class="expiry-notice" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 6px; font-size: 13px; color: #92400E; font-weight: 600;">
                    ⏱️ This verification code will expire in 15 minutes for your security.
                </div>
                <p class="info-text" style="font-size: 15px; color: #334155; margin: 15px 0; line-height: 1.65;">
                    Simply enter this code on the verification screen to activate your account.
                </p>
                <div class="security-note" style="margin-top: 25px; padding: 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #64748B; line-height: 1.6;">
                    <strong style="color: #334155;">🛡️ Security Notice:</strong> If you did not create an account with AI LEGAL™, please ignore this email. No further action is required.
                </div>
            </div>
            <div class="footer" style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;"><strong>AI LEGAL™</strong> — Legal Intelligence Platform</p>
                <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
                <p style="margin: 0;"><a href="${DASHBOARD_URL}" style="color: #B48628; text-decoration: none; font-weight: 700;">Open Dashboard</a></p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const Welcome_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AI LEGAL™</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif;">
    <div style="padding: 40px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D;">
            <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px;">
                    Legal Intelligence Platform
                </div>
            </div>
            <div style="padding: 36px 32px; color: #1E293B;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">Welcome to AI LEGAL™ 🎉</h2>
                <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 14px;">Hello {name},</p>
                <p style="font-size: 15px; color: #475569; line-height: 1.65; margin: 0 0 20px 0;">
                    Your legal intelligence journey starts here. AI LEGAL™ is your unified legal workspace designed to assist with statutory research, precedent analysis, automated court drafting, and case outcomes.
                </p>
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <div style="display: inline-block; padding: 4px 12px; background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
                        Account Verified
                    </div>
                    <p style="margin: 0; font-size: 20px; font-weight: 900; color: #0F172A;">Free Tier Workspace</p>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #475569;">You can now explore court drafting, precedent research, and contract review tools.</p>
                </div>
                <div style="text-align: center; margin: 24px 0; padding: 16px 20px; background: #FFFDF5; border: 1.5px dashed #C8A34D; border-radius: 12px;">
                    <p style="font-size: 11px; color: #854D0E; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; margin: 0 0 6px 0;">Direct Dashboard Link</p>
                    <a href="{dashboardUrl}" style="color: #B48628; font-size: 15px; font-weight: 800; text-decoration: underline; word-break: break-all;">{dashboardUrl}</a>
                </div>
            </div>
            <div style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;"><strong>AI LEGAL™</strong> — Legal Intelligence Platform</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const Reset_Password_OTP_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - AI LEGAL™</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif;">
    <div style="padding: 40px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D;">
            <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px;">
                    Security Center
                </div>
            </div>
            <div style="padding: 36px 32px; color: #1E293B;">
                <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">🔒 Reset Your Password</h2>
                <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 14px;">Hello {name},</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.65; margin: 0 0 20px 0;">
                    We received a request to reset your AI LEGAL™ password. Use the verification OTP code below:
                </p>
                <div style="display: block; margin: 24px 0; font-size: 34px; color: #0F172A; background: #FFFDF5; border: 2px dashed #C8A34D; padding: 18px 24px; text-align: center; border-radius: 12px; font-weight: 900; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                    {otpCode}
                </div>
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 6px; font-size: 13px; color: #92400E; font-weight: 600;">
                    ⏱️ This code is valid for 15 minutes. If you did not request a password reset, please disregard this email.
                </div>
            </div>
            <div style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;"><strong>AI LEGAL™</strong> — Secure Legal Intelligence</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const Reset_Password_Email_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - AI LEGAL™</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif;">
    <div style="padding: 40px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D;">
            <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px;">
                    Security Center
                </div>
            </div>
            <div style="padding: 36px 32px; color: #1E293B;">
                <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">🔒 Reset Your Password</h2>
                <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 14px;">Hello {name},</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.65; margin: 0 0 24px 0;">
                    We received a request to reset your password for your AI LEGAL™ account. Click the button below to choose a new password:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="{resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; padding: 15px 38px; border-radius: 10px; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">
                        Reset Password →
                    </a>
                </div>
                <p style="font-size: 13px; color: #64748B; line-height: 1.6;">
                    If you didn't request a password reset, you can safely ignore this email.
                </p>
            </div>
            <div style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;"><strong>AI LEGAL™</strong> — Secure Legal Intelligence</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const Password_Change_Success_Template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully - AI LEGAL™</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif;">
    <div style="padding: 40px 10px;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF !important; border-radius: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D;">
            <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
                <img src="https://ailegal.aisa24.com/logo-transparent.png" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
                <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
                    AI LEGAL<span style="color: #C8A34D;">™</span>
                </h1>
                <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px;">
                    Security Notification
                </div>
            </div>
            <div style="padding: 36px 32px; color: #1E293B;">
                <div style="display: inline-block; padding: 4px 12px; background: #DCFCE7; border: 1px solid #86EFAC; color: #15803D; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">
                    Security Alert
                </div>
                <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">✅ Password Changed Successfully</h2>
                <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 14px;">Hello {name},</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.65; margin: 0 0 20px 0;">
                    Your password for AI LEGAL™ has been successfully updated.
                </p>
                <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 14px 16px; margin: 20px 0; border-radius: 6px; font-size: 13px; color: #991B1B; font-weight: 600;">
                    ⚠️ If you did not make this change, please reset your password immediately or contact our security team.
                </div>
            </div>
            <div style="background-color: #F8FAFC; padding: 22px 24px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #E2E8F0; line-height: 1.6;">
                <p style="margin: 0 0 4px 0;"><strong>AI LEGAL™</strong> — Secure Legal Intelligence</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} AI LEGAL™. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const renderEmailTemplate = (template, data) => {
    let rendered = template;
    Object.keys(data).forEach(key => {
        const placeholder = new RegExp(`{${key}}`, 'g');
        rendered = rendered.replace(placeholder, data[key] || '');
    });
    return rendered;
};

export const stripHTMLToText = (html) => {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

export default {
    Verification_Email_Template,
    Welcome_Email_Template,
    Reset_Password_OTP_Template,
    Reset_Password_Email_Template,
    Password_Change_Success_Template,
    renderEmailTemplate,
    stripHTMLToText
};