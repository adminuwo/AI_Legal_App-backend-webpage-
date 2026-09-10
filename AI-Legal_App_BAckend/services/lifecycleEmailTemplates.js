/**
 * AI LEGAL™ — Lifecycle Email HTML Templates
 * Luxury Legal Theme: Pure White Card (#FFFFFF), Dark High-Contrast Slate/Black (#0F172A), Gold (#C8A34D), Warm Gold (#B48628).
 * Typography: Times New Roman across all headings, body text, cards, and buttons.
 * Thread-Trim Prevention: Unique dynamic dispatch references to prevent Gmail from collapsing body text into `...`.
 * Uses inline styling for 100% email client compatibility (Gmail, Outlook, Apple Mail, Yahoo).
 */

const DASHBOARD_URL = 'https://ailegal.aisa24.com/';
const PRICING_URL = 'https://ailegal.aisa24.com/legal-pricing/index.html';
const LOGO_URL = 'https://ailegal.aisa24.com/logo-transparent.png';

const baseEmailWrapper = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI LEGAL™</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif !important; }
    table { border-spacing: 0; font-family: 'Times New Roman', Times, serif !important; }
    td { padding: 0; font-family: 'Times New Roman', Times, serif !important; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F1F5F9; padding: 40px 10px; font-family: 'Times New Roman', Times, serif !important; }
    .main { background-color: #FFFFFF !important; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); font-family: 'Times New Roman', Times, serif !important; }
    .header { background-color: #FFFFFF !important; padding: 36px 24px 22px 24px; text-align: center; border-bottom: 1px solid #F1F5F9; font-family: 'Times New Roman', Times, serif !important; }
    .logo-img { width: 78px; height: 78px; max-width: 78px; margin: 0 auto 10px auto; display: block; border: 0; outline: none; text-decoration: none; }
    .logo-text { color: #0F172A !important; font-size: 28px; font-weight: 900; letter-spacing: 0.02em; margin: 6px 0 0 0; font-family: 'Times New Roman', Times, serif !important; }
    .logo-sub { color: #B48628 !important; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.22em; margin-top: 6px; font-family: 'Times New Roman', Times, serif !important; }
    .content { padding: 36px 32px; color: #1E293B !important; background-color: #FFFFFF !important; font-family: 'Times New Roman', Times, serif !important; }
    .footer { padding: 24px 32px; background-color: #F8FAFC !important; text-align: center; border-top: 1px solid #E2E8F0; font-size: 13px; color: #64748B !important; line-height: 1.6; font-family: 'Times New Roman', Times, serif !important; }
    .footer a { color: #B48628 !important; text-decoration: none; font-family: 'Times New Roman', Times, serif !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Times New Roman', Times, serif !important;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden; font-family: 'Times New Roman', Times, serif;">${previewText}</div>` : ''}
  <table class="wrapper" style="width: 100%; table-layout: fixed; background-color: #F1F5F9; padding: 40px 10px; font-family: 'Times New Roman', Times, serif !important;">
    <tr>
      <td align="center" style="font-family: 'Times New Roman', Times, serif !important;">
        <!-- Pure White AI LEGAL™ Card Container -->
        <div class="main" style="background-color: #FFFFFF !important; background: #FFFFFF !important; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; border: 1px solid #E2E8F0; border-top: 4px solid #C8A34D; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06); text-align: left; font-family: 'Times New Roman', Times, serif !important;">
          
          <!-- Header with Original AI LEGAL™ Logo on Pure White -->
          <div class="header" style="background-color: #FFFFFF !important; background: #FFFFFF !important; padding: 36px 24px 22px 24px; text-align: center; border-bottom: 1px solid #F1F5F9; font-family: 'Times New Roman', Times, serif !important;">
            <div style="text-align: center; margin-bottom: 10px;">
              <img src="${LOGO_URL}" alt="AI LEGAL™" width="78" height="78" class="logo-img" style="width: 78px; height: 78px; max-width: 78px; margin: 0 auto; display: block; border: 0; outline: none; text-decoration: none;" />
            </div>
            <h1 class="logo-text" style="color: #0F172A !important; font-size: 28px; font-weight: 900; letter-spacing: 0.02em; margin: 6px 0 0 0; font-family: 'Times New Roman', Times, serif !important;">
              AI LEGAL<span style="color: #C8A34D;">™</span>
            </h1>
            <div class="logo-sub" style="color: #B48628 !important; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.22em; margin-top: 6px; font-family: 'Times New Roman', Times, serif !important;">
              Legal Intelligence Platform
            </div>
          </div>

          <!-- Main Email Content (Crisp Pure White Card) -->
          <div class="content" style="padding: 36px 32px; color: #1E293B !important; background-color: #FFFFFF !important; background: #FFFFFF !important; font-family: 'Times New Roman', Times, serif !important;">
            ${content}
          </div>

          <!-- Footer with Clean Accents -->
          <div class="footer" style="padding: 24px 32px; background-color: #F8FAFC !important; background: #F8FAFC !important; text-align: center; border-top: 1px solid #E2E8F0; font-size: 13px; color: #64748B !important; line-height: 1.6; font-family: 'Times New Roman', Times, serif !important;">
            <p style="margin: 0 0 6px 0; color: #64748B !important; font-family: 'Times New Roman', Times, serif !important;">© 2026 AI LEGAL™. All rights reserved.</p>
            <p style="margin: 0 0 10px 0; color: #94A3B8 !important; font-family: 'Times New Roman', Times, serif !important;">Empowering legal research, analysis, and court drafting with enterprise AI.</p>
            <p style="margin: 0; font-family: 'Times New Roman', Times, serif !important;">
              <a href="${DASHBOARD_URL}" style="color: #B48628 !important; text-decoration: none; font-weight: 700; font-family: 'Times New Roman', Times, serif !important;">Open Dashboard</a>
              <span style="color: #CBD5E1; margin: 0 8px;">•</span>
              <a href="${PRICING_URL}" style="color: #B48628 !important; text-decoration: none; font-weight: 700; font-family: 'Times New Roman', Times, serif !important;">Plans & Pricing</a>
            </p>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const getWelcomeEmailHtml = ({ name, planName = 'Free Plan' }) => {
  const displayName = (name || '').trim();
  const greeting = displayName ? `Hi ${displayName},` : 'Welcome to AI LEGAL™,';
  const dispatchRef = `AL-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const dispatchDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const body = `
    <!-- Unique Dispatch Line (Prevents Gmail from collapsing body into '...') -->
    <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
      Official Dispatch &bull; Ref: #${dispatchRef} &bull; ${dispatchDate}
    </div>
    <span style="opacity: 0; color: transparent; display: none !important; font-size: 0px; height: 0; width: 0; line-height: 0; mso-hide: all;">
      [AI-LEGAL-AUTH-TOKEN:${Date.now()}-${Math.floor(Math.random() * 89999 + 10000)}]
    </span>

    <h2 style="font-family: 'Times New Roman', Times, serif !important; font-size: 24px; font-weight: 800; color: #0F172A !important; margin: 0 0 16px 0; letter-spacing: -0.01em;">
      Welcome to AI LEGAL™ 🎉
    </h2>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #0F172A !important; margin: 0 0 14px 0; font-weight: 700;">
      ${greeting}
    </p>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #475569 !important; margin: 0 0 18px 0;">
      Your legal intelligence journey starts here.
    </p>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 15.5px; line-height: 1.7; color: #334155 !important; margin: 0 0 24px 0;">
      <strong style="color: #0F172A !important; font-family: 'Times New Roman', Times, serif !important;">AI LEGAL™</strong> is your intelligent legal workspace designed to assist with comprehensive statutory research, landmark case precedent analysis, automated court drafting, contract review, and document analysis — all in one unified, secure platform.
    </p>

    <!-- Plan Card in Clean Light Tone on Pure White -->
    <div style="font-family: 'Times New Roman', Times, serif !important; background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; border-radius: 12px; padding: 20px 22px; margin: 24px 0;">
      <div style="font-family: 'Times New Roman', Times, serif !important; display: inline-block; padding: 4px 12px; background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
        Account Verified
      </div>
      <p style="font-family: 'Times New Roman', Times, serif !important; margin: 0 0 4px 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
        Current Plan
      </p>
      <p style="font-family: 'Times New Roman', Times, serif !important; margin: 0; font-size: 26px; font-weight: 900; color: #0F172A !important; letter-spacing: 0.02em;">
        ${planName}
      </p>
      <p style="font-family: 'Times New Roman', Times, serif !important; margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.55;">
        You can now explore the available AI LEGAL™ features and tools included with your Free Plan.
      </p>
    </div>

    <!-- Direct Dashboard Link (Placed right below plan card) -->
    <div style="font-family: 'Times New Roman', Times, serif !important; text-align: center; margin: 22px 0 18px 0; padding: 16px 20px; background: #FFFDF5; border: 1.5px dashed #C8A34D; border-radius: 12px;">
      <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; color: #854D0E; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; margin: 0 0 6px 0;">
        Direct Dashboard Link
      </p>
      <a href="${DASHBOARD_URL}" style="font-family: 'Times New Roman', Times, serif !important; color: #B48628 !important; font-size: 16px; font-weight: 800; text-decoration: underline; word-break: break-all;">
        ${DASHBOARD_URL}
      </a>
    </div>

    <p style="font-family: 'Times New Roman', Times, serif !important; margin-top: 24px; font-size: 13.5px; color: #64748B !important; border-top: 1px solid #F1F5F9; padding-top: 18px; line-height: 1.6;">
      You can upgrade anytime to unlock continuous drafting, high-volume case predictions, priority processing, and higher usage limits. Enjoy using AI LEGAL™.
    </p>
  `;

  return baseEmailWrapper(body, 'Welcome to AI LEGAL™ — Your legal intelligence journey starts here.');
};

export const getFeatureExhaustedEmailHtml = ({
  name,
  featureName,
  featureLimit = 2,
  exhaustedFeatures = [],
  availableFeatures = []
}) => {
  const displayName = (name || '').trim();
  const greeting = displayName ? `Hi ${displayName},` : 'Hello,';
  const dispatchRef = `AL-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const dispatchDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const exhaustedListHtml = exhaustedFeatures && exhaustedFeatures.length > 0
    ? exhaustedFeatures.map(f => `
        <div style="font-family: 'Times New Roman', Times, serif !important; display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #FEE2E2; color: #DC2626; font-size: 14px;">
          <span>❌ <strong style="color: #991B1B; font-family: 'Times New Roman', Times, serif !important;">${f.featureName || f.featureId}</strong></span>
          <span style="font-weight: 800; color: #DC2626; font-family: 'Times New Roman', Times, serif !important;">${f.used}/${f.limit} (0 left)</span>
        </div>
      `).join('')
    : `
        <div style="font-family: 'Times New Roman', Times, serif !important; display: flex; align-items: center; justify-content: space-between; padding: 9px 0; color: #DC2626; font-size: 14px;">
          <span>❌ <strong style="color: #991B1B; font-family: 'Times New Roman', Times, serif !important;">${featureName}</strong></span>
          <span style="font-weight: 800; color: #DC2626; font-family: 'Times New Roman', Times, serif !important;">${featureLimit}/${featureLimit} (0 left)</span>
        </div>
      `;

  const availableListHtml = availableFeatures && availableFeatures.length > 0
    ? availableFeatures.map(f => `
        <div style="font-family: 'Times New Roman', Times, serif !important; display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #FEF08A; color: #854D0E; font-size: 14px;">
          <span><span style="color: #15803D; font-weight: 900; margin-right: 6px;">✓</span> <strong style="font-family: 'Times New Roman', Times, serif !important;">${f.featureName || f.featureId}</strong></span>
          <span style="font-weight: 800; color: #15803D; font-family: 'Times New Roman', Times, serif !important;">${f.remaining} uses left</span>
        </div>
      `).join('')
    : '<p style="font-family: \'Times New Roman\', Times, serif !important; margin: 0; color: #64748B; font-size: 13px;">No remaining features in this cycle.</p>';

  const body = `
    <!-- Unique Dispatch Line (Prevents Gmail from collapsing body into '...') -->
    <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
      Official Notification &bull; Ref: #${dispatchRef} &bull; ${dispatchDate}
    </div>
    <span style="opacity: 0; color: transparent; display: none !important; font-size: 0px; height: 0; width: 0; line-height: 0; mso-hide: all;">
      [AI-LEGAL-USAGE-TOKEN:${Date.now()}-${Math.floor(Math.random() * 89999 + 10000)}]
    </span>

    <h2 style="font-family: 'Times New Roman', Times, serif !important; font-size: 24px; font-weight: 800; color: #0F172A !important; margin: 0 0 16px 0; letter-spacing: -0.01em;">
      Free Limit Reached for ${featureName}
    </h2>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #0F172A !important; margin: 0 0 14px 0; font-weight: 700;">
      ${greeting}
    </p>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #475569 !important; margin: 0 0 20px 0;">
      You have reached the Free Plan usage limit for:
    </p>

    <!-- Specific Feature Card -->
    <div style="font-family: 'Times New Roman', Times, serif !important; background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 8px;">
        ${featureName}
      </div>
      <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 14px; color: #475569; line-height: 1.6;">
        <strong style="color: #64748B;">Limit:</strong> <span style="color: #0F172A; font-weight: 600;">${featureLimit} uses</span><br>
        <strong style="color: #64748B;">Used:</strong> <span style="color: #DC2626; font-weight: 700;">${featureLimit}</span><br>
        <strong style="color: #64748B;">Remaining:</strong> <span style="color: #DC2626; font-weight: 700;">0 left</span>
      </div>
    </div>

    <!-- Exhausted Features List -->
    <div style="font-family: 'Times New Roman', Times, serif !important; background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; font-weight: 800; color: #991B1B; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em;">
        Exhausted Free Features:
      </div>
      ${exhaustedListHtml}
    </div>

    <!-- Available Features List -->
    ${availableFeatures && availableFeatures.length > 0 ? `
    <div style="font-family: 'Times New Roman', Times, serif !important; background: #FFFDF5; border: 1px solid #FEF08A; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; font-weight: 800; color: #854D0E; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em;">
        Still Available on Your Free Plan:
      </div>
      ${availableListHtml}
    </div>
    ` : ''}

    <p style="font-family: 'Times New Roman', Times, serif !important; text-align: center; margin-top: 26px; font-size: 16px; color: #0F172A; font-weight: 600;">
      Want to continue using <strong>${featureName}</strong> without limits?
    </p>

    <!-- Golden Upgrade Button -->
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${PRICING_URL}" style="font-family: 'Times New Roman', Times, serif !important; display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; padding: 16px 42px; border-radius: 10px; font-size: 15px; font-weight: 900; text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">
        UPGRADE PLAN →
      </a>
    </div>

    <!-- Direct Pricing Link -->
    <div style="font-family: 'Times New Roman', Times, serif !important; text-align: center; margin: 20px 0 16px 0; padding: 14px 16px; background: #FFFDF5; border: 1px dashed #C8A34D; border-radius: 10px;">
      <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; color: #854D0E; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; margin: 0 0 6px 0;">
        Pricing & Upgrade Portal
      </p>
      <a href="${PRICING_URL}" style="font-family: 'Times New Roman', Times, serif !important; color: #B48628 !important; font-size: 15px; font-weight: 800; text-decoration: underline; word-break: break-all;">
        ${PRICING_URL}
      </a>
    </div>

    <p style="font-family: 'Times New Roman', Times, serif !important; margin-top: 26px; font-size: 13.5px; color: #64748B !important; border-top: 1px solid #F1F5F9; padding-top: 16px; line-height: 1.6;">
      Upgrading unlocks higher drafting caps, unlimited legal research access, priority processing, and continuous legal operations.
    </p>
  `;

  return baseEmailWrapper(body, `Your ${featureName} free usage limit has been reached.`);
};

export const getFreePlanFullyExhaustedEmailHtml = ({
  name,
  exhaustedFeatures = []
}) => {
  const displayName = (name || '').trim();
  const greeting = displayName ? `Hi ${displayName},` : 'Hello,';
  const dispatchRef = `AL-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const dispatchDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const exhaustedListHtml = exhaustedFeatures && exhaustedFeatures.length > 0
    ? exhaustedFeatures.map(f => `
        <div style="font-family: 'Times New Roman', Times, serif !important; display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #FEE2E2; color: #DC2626; font-size: 14px;">
          <span>❌ <strong style="color: #991B1B; font-family: 'Times New Roman', Times, serif !important;">${f.featureName || f.featureId}</strong></span>
          <span style="font-weight: 800; color: #DC2626; font-family: 'Times New Roman', Times, serif !important;">${f.used}/${f.limit} (Exhausted)</span>
        </div>
      `).join('')
    : '<p style="font-family: \'Times New Roman\', Times, serif !important; margin: 0; color: #991B1B; font-size: 13px;">All applicable Free Plan limits have been reached.</p>';

  const body = `
    <!-- Unique Dispatch Line (Prevents Gmail from collapsing body into '...') -->
    <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px 0; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
      Official Notification &bull; Ref: #${dispatchRef} &bull; ${dispatchDate}
    </div>
    <span style="opacity: 0; color: transparent; display: none !important; font-size: 0px; height: 0; width: 0; line-height: 0; mso-hide: all;">
      [AI-LEGAL-FINAL-TOKEN:${Date.now()}-${Math.floor(Math.random() * 89999 + 10000)}]
    </span>

    <h2 style="font-family: 'Times New Roman', Times, serif !important; font-size: 24px; font-weight: 800; color: #0F172A !important; margin: 0 0 16px 0; letter-spacing: -0.01em;">
      Your AI LEGAL™ Free Plan Limits Have Been Reached
    </h2>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #0F172A !important; margin: 0 0 14px 0; font-weight: 700;">
      ${greeting}
    </p>
    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 16px; line-height: 1.65; color: #475569 !important; margin: 0 0 20px 0;">
      You have now utilized all available feature limits included with your <strong style="color: #0F172A; font-family: 'Times New Roman', Times, serif !important;">AI LEGAL™ Free Plan</strong>.
    </p>

    <!-- Full Exhaustion Card -->
    <div style="font-family: 'Times New Roman', Times, serif !important; background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #C8A34D; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; font-weight: 800; color: #854D0E; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em;">
        Free Plan Usage Summary:
      </div>
      ${exhaustedListHtml}
      <p style="font-family: 'Times New Roman', Times, serif !important; margin: 14px 0 0 0; font-size: 14px; color: #64748B; line-height: 1.5;">
        All complimentary tools in this cycle have been exhausted.
      </p>
    </div>

    <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 17px; font-weight: 700; text-align: center; margin-top: 28px; color: #0F172A;">
      Ready to continue without interruptions?
    </p>

    <!-- Golden Upgrade Button -->
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${PRICING_URL}" style="font-family: 'Times New Roman', Times, serif !important; display: inline-block; background: linear-gradient(135deg, #F3D37A 0%, #C8A34D 50%, #A47D2E 100%); background-color: #C8A34D; color: #0F172A !important; padding: 16px 42px; border-radius: 10px; font-size: 15px; font-weight: 900; text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 8px 24px rgba(200, 163, 77, 0.35);">
        UPGRADE NOW →
      </a>
    </div>

    <!-- Direct Pricing Link -->
    <div style="font-family: 'Times New Roman', Times, serif !important; text-align: center; margin: 20px 0 16px 0; padding: 14px 16px; background: #FFFDF5; border: 1px dashed #C8A34D; border-radius: 10px;">
      <p style="font-family: 'Times New Roman', Times, serif !important; font-size: 12px; color: #854D0E; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; margin: 0 0 6px 0;">
        View Subscription Plans
      </p>
      <a href="${PRICING_URL}" style="font-family: 'Times New Roman', Times, serif !important; color: #B48628 !important; font-size: 15px; font-weight: 800; text-decoration: underline; word-break: break-all;">
        ${PRICING_URL}
      </a>
    </div>

    <p style="font-family: 'Times New Roman', Times, serif !important; margin-top: 26px; font-size: 13.5px; color: #64748B !important; border-top: 1px solid #F1F5F9; padding-top: 16px; line-height: 1.6;">
      Upgrading unlocks unlimited case preparation, extended drafting tools, higher token allocations, and full access to the AI Legal suite. Thank you for using AI LEGAL™.
    </p>
  `;

  return baseEmailWrapper(body, 'Your AI LEGAL™ Free Plan limits have been fully reached. Upgrade to continue.');
};

export default {
  getWelcomeEmailHtml,
  getFeatureExhaustedEmailHtml,
  getFreePlanFullyExhaustedEmailHtml
};
