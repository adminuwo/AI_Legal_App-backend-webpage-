import { Verification_Email_Template, Welcome_Email_Template, Reset_Password_Email_Template, Password_Change_Success_Template, Reset_Password_OTP_Template } from "./EmailTemplate.js";
import { resend, transporter } from "./Email.config.js";
import { dashboardUrl } from "../consts.js";

const LOGO_URL = 'https://ailegal.aisa24.com/logo-transparent.png';

export const sendVerificationEmail = async (email, name, verificationCode) => {
  try {
    const response = await resend.emails.send({
      from: `AI LEGAL™ <${process.env.EMAIL}>`,
      to: [email],
      subject: "Verify Your Email",
      html: Verification_Email_Template.replace("{name}", name).replace("{verificationCode}", verificationCode)
    });
    console.log("resend_msg", response);
  } catch (error) {
    console.log('Email error', error);
  }
};

// WELCOME EMAIL
export const welcomeEmail = async (name, email) => {
  const info = await resend.emails.send({
    from: `AI LEGAL™ <${process.env.EMAIL}>`,
    to: [email],
    subject: `Welcome ${name}`,
    html: Welcome_Email_Template.replace("{name}", name).replace("{dashboardUrl}", dashboardUrl),
  });
};

export const sendResetPasswordEmail = async (email, name, resetUrl) => {
  try {
    const response = await resend.emails.send({
      from: `AI LEGAL™ <${process.env.EMAIL}>`,
      to: [email],
      subject: "Reset Your Password",
      html: Reset_Password_Email_Template.replace("{name}", name).replace("{resetUrl}", resetUrl)
    });
    console.log("resend_msg", response);
  } catch (error) {
    console.log('Email error', error);
  }
};

export const sendResetPasswordOTP = async (email, name, otpCode) => {
  try {
    const response = await resend.emails.send({
      from: `AI LEGAL™ <${process.env.EMAIL}>`,
      to: [email],
      subject: "Your Password Reset OTP",
      html: Reset_Password_OTP_Template.replace("{name}", name).replace("{otpCode}", otpCode)
    });
    console.log("resend_otp_msg", response);
  } catch (error) {
    console.log('Email OTP error', error);
  }
};

export const sendPasswordChangeSuccessEmail = async (email, name) => {
  try {
    const response = await resend.emails.send({
      from: `AI LEGAL™ <${process.env.EMAIL}>`,
      to: [email],
      subject: "Password Updated Successfully",
      html: Password_Change_Success_Template.replace("{name}", name)
    });
    console.log("resend_msg", response);
  } catch (error) {
    console.log('Email error', error);
  }
};

export const sendFeedbackEmail = async (feedback) => {
  try {
    const isUp = feedback.type === 'thumbs_up';
    const response = await resend.emails.send({
      from: `AI LEGAL™ Feedback <${process.env.EMAIL}>`,
      to: ['admin@uwo24.com'],
      subject: `📢 New Feedback: ${isUp ? 'Positive' : 'Negative'}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
            <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
            <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
              AI LEGAL<span style="color: #C8A34D;">™</span>
            </h1>
            <div style="color: #B48628; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
              Feedback System
            </div>
          </div>
          <div style="padding: 28px 24px;">
            <div style="display: inline-block; padding: 4px 14px; background: ${isUp ? '#DCFCE7' : '#FEE2E2'}; border: 1px solid ${isUp ? '#86EFAC' : '#FCA5A5'}; color: ${isUp ? '#15803D' : '#DC2626'}; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px;">
              ${isUp ? '👍 Thumbs Up' : '👎 Thumbs Down'}
            </div>
            <div style="background: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0; margin-bottom: 18px;">
              <p style="margin: 6px 0;"><strong>Session ID:</strong> ${feedback.sessionId}</p>
              <p style="margin: 6px 0;"><strong>Message ID:</strong> ${feedback.messageId}</p>
              ${feedback.categories && feedback.categories.length > 0 ? `<p style="margin: 6px 0;"><strong>Categories:</strong> ${feedback.categories.join(', ')}</p>` : ''}
            </div>
            <div style="background: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; color: #64748B; font-weight: 700; font-size: 12px; text-transform: uppercase;">Details:</p>
              <p style="margin: 0; color: #1E293B; line-height: 1.6;">${feedback.details || 'None'}</p>
            </div>
          </div>
          <div style="background: #F8FAFC; padding: 16px 24px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 12px;">
            <p style="margin: 0;">Generated by AI LEGAL™ Feedback System</p>
          </div>
        </div>
      `
    });
    console.log("feedback_email_res", response);
  } catch (error) {
    console.log('Feedback email error', error);
  }
};

export const sendReviewGatekeeperAlertEmail = async (feedbackData) => {
  try {
    const isNegative = feedbackData.type === 'gatekeeper_negative' || (feedbackData.rating && feedbackData.rating <= 3);
    const platformLabel = feedbackData.platform === 'mobile_app' ? 'Mobile App' : (feedbackData.platform === 'web_app' ? 'Web Application' : 'Unknown');
    const userDisplay = feedbackData.userName ? `${feedbackData.userName} (${feedbackData.userEmail || 'No Email'})` : (feedbackData.userEmail || 'Anonymous User');

    const response = await resend.emails.send({
      from: `AI LEGAL™ Support Alert <${process.env.EMAIL}>`,
      to: ['admin@uwo24.com'],
      subject: isNegative 
        ? `🚨 [URGENT FEEDBACK] Negative Review Intercepted on ${platformLabel}`
        : `🌟 [User Feedback] Positive In-App Feedback on ${platformLabel}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          <div style="background: #FFFFFF; padding: 34px 24px 20px 24px; text-align: center; border-bottom: 1px solid #F1F5F9;">
            <img src="${LOGO_URL}" alt="AI LEGAL™" width="76" height="76" style="width: 76px; height: 76px; max-width: 76px; margin: 0 auto 8px auto; display: block; border: 0;" />
            <h1 style="margin: 6px 0 0 0; font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 0.02em;">
              AI LEGAL<span style="color: #C8A34D;">™</span>
            </h1>
            <div style="color: ${isNegative ? '#DC2626' : '#15803D'}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px;">
              ${isNegative ? '⚠️ Negative Review Intercepted' : '⭐ Positive User Feedback'}
            </div>
          </div>

          <div style="padding: 28px 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 16px; color: #64748B; width: 140px;">Platform:</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0F172A;">${platformLabel}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 16px; color: #64748B;">User:</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0F172A;">${userDisplay}</td>
              </tr>
              ${feedbackData.rating ? `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 16px; color: #64748B;">Rating Given:</td>
                <td style="padding: 10px 16px; font-weight: 600; color: ${isNegative ? '#DC2626' : '#15803D'};">${feedbackData.rating} / 5 Stars</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 10px 16px; color: #64748B;">Timestamp:</td>
                <td style="padding: 10px 16px; color: #475569;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>
            </table>

            <div style="background-color: #F8FAFC; border-left: 4px solid ${isNegative ? '#DC2626' : '#15803D'}; border: 1px solid #E2E8F0; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 8px 0; color: #0F172A; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">User Feedback / Improvement Request:</h4>
              <p style="margin: 0; color: #334155; font-size: 14.5px; line-height: 1.55; white-space: pre-wrap;">${feedbackData.details || feedbackData.feedbackText || 'No specific comments provided.'}</p>
            </div>
          </div>

          <div style="border-top: 1px solid #E2E8F0; padding: 16px 24px; font-size: 12px; color: #64748B; text-align: center; background: #F8FAFC;">
            <p style="margin: 0;">AI LEGAL™ Review Gatekeeper System &bull; Safeguarding App Store Reputation</p>
          </div>
        </div>
      `
    });
    console.log("review_gatekeeper_email_res", response);
    return response;
  } catch (error) {
    console.log('Review gatekeeper email error', error);
  }
};
