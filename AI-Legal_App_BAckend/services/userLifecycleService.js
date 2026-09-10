/**
 * AI LEGAL™ — Automated User Lifecycle & Feature Limit Email Service
 * Production-grade, event-driven orchestrator managing welcome emails, feature exhaustion,
 * multi-feature telemetry, and audit reporting across Web & Mobile.
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import EmailEvent from '../models/EmailEvent.js';
import PlanUsage from '../models/PlanUsage.js';
import * as FeatureAccessManager from './featureAccessManager.js';
import {
  getWelcomeEmailHtml,
  getFeatureExhaustedEmailHtml,
  getFreePlanFullyExhaustedEmailHtml
} from './lifecycleEmailTemplates.js';
import { resend, transporter } from '../utils/Email.config.js';
import * as XLSX from 'xlsx';

// Friendly Feature Display Name Registry
export const FEATURE_DISPLAY_NAMES = {
  draft_maker: 'Draft Maker',
  court_prep: 'Court Preparation & Argument Builder',
  legal_precedent: 'Legal Precedent & Research',
  evidence_analysis: 'Evidence Analysis & Forensic Scanner',
  contract_review: 'Contract Review & Risk Analyzer',
  strategy_engine: 'Case Strategy Engine',
  case_predictor: 'Case Outcome Predictor',
  mock_courtroom: 'Mock Courtroom Trials',
  client_connect: 'Client Connect',
  quiz_practice: 'Quiz & MCQ Practice',
  notes_maker: 'AI Notes Maker',
  cases: 'Case Management Workspace',
  ai_chat: 'AI Legal Assistant'
};

export const getFeatureDisplayName = (featureKey) => {
  const norm = FeatureAccessManager.normalizeFeatureKey(featureKey);
  return FEATURE_DISPLAY_NAMES[norm] || FEATURE_DISPLAY_NAMES[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Dispatch an email with fallback handling between Resend and Nodemailer.
 * Updates EmailEvent audit document status upon completion.
 */
export const dispatchEmail = async (emailEventId, { to, subject, html }) => {
  const senderEmail = process.env.EMAIL || 'noreply@ailegal.aisa24.com';
  let success = false;
  let failureReason = null;

  try {
    // 1. Try Resend if configured
    if (process.env.RESEND_API_KEY && resend?.emails?.send) {
      try {
        const res = await resend.emails.send({
          from: `AI LEGAL™ <${senderEmail}>`,
          to: [to],
          subject,
          html
        });
        if (res && (res.id || !res.error)) {
          success = true;
        } else if (res?.error) {
          failureReason = res.error.message || JSON.stringify(res.error);
        }
      } catch (resendErr) {
        failureReason = resendErr.message;
      }
    }

    // 2. Fallback to Nodemailer SMTP transporter if Resend didn't succeed
    if (!success && transporter) {
      try {
        await transporter.sendMail({
          from: `"AI LEGAL™" <${senderEmail}>`,
          to,
          subject,
          html
        });
        success = true;
        failureReason = null;
      } catch (smtpErr) {
        failureReason = failureReason ? `${failureReason} | SMTP: ${smtpErr.message}` : smtpErr.message;
      }
    }

    // 3. Fallback for test / dev environment without active SMTP credentials
    if (!success && !process.env.RESEND_API_KEY && !process.env.EMAIL_PASS_KEY) {
      console.log(`[USER-LIFECYCLE MOCK EMAIL] To: ${to} | Subject: "${subject}"`);
      success = true;
      failureReason = null;
    }
  } catch (err) {
    failureReason = err.message;
  }

  // Update EmailEvent audit record
  try {
    await EmailEvent.findByIdAndUpdate(emailEventId, {
      emailStatus: success ? 'SENT' : 'FAILED',
      sentAt: success ? new Date() : null,
      failureReason: success ? null : failureReason
    });
    if (success) {
      console.log(`[EMAIL-AUDIT] Successfully sent "${subject}" to ${to} (Event: ${emailEventId})`);
    } else {
      console.warn(`[EMAIL-AUDIT] Failed sending "${subject}" to ${to}: ${failureReason} (Event: ${emailEventId})`);
    }
  } catch (dbErr) {
    console.error(`[EMAIL-AUDIT] Failed updating EmailEvent ${emailEventId}:`, dbErr.message);
  }

  return { success, failureReason };
};

/**
 * Handle First-Time User Registration Welcome Email
 * Idempotent, atomic check guarantees NO duplicate emails and NO emails on subsequent logins.
 */
export const handleNewUserRegistration = async (user, authMethod = 'email', platform = 'web') => {
  if (!user || !user._id || !user.email) return;

  const userId = user._id;
  const email = user.email.toLowerCase().trim();
  const name = user.name || user.fullName || email.split('@')[0];
  const idempotencyKey = `${userId.toString()}_WELCOME_EMAIL`;

  try {
    // Atomic test: check if welcome email already recorded in User or EmailEvent
    const userDoc = await User.findById(userId);
    if (userDoc?.welcomeEmailSent) {
      return; // Already welcomed
    }

    // Create EmailEvent record with unique idempotencyKey
    let emailEvent;
    try {
      emailEvent = await EmailEvent.create({
        userId,
        name,
        email,
        accountCreatedAt: userDoc?.createdAt || new Date(),
        currentPlan: userDoc?.subscription?.plan || 'FREE',
        eventType: 'WELCOME_EMAIL',
        emailSubject: 'Welcome to AI LEGAL™',
        emailStatus: 'PENDING',
        platform: platform || userDoc?.deviceOS || 'web',
        authenticationMethod: authMethod || userDoc?.signupMethod || 'email',
        idempotencyKey
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        // Event already created concurrently
        return;
      }
      throw dupErr;
    }

    // Mark user state atomically
    await User.findByIdAndUpdate(userId, {
      $set: {
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date(),
        signupMethod: authMethod,
        signupPlatform: platform
      }
    });

    console.log(`[USER-LIFECYCLE] New User Registered: ${email} via ${authMethod} (${platform}). Queuing Welcome Email...`);

    // Asynchronous non-blocking dispatch
    const html = getWelcomeEmailHtml({ name, planName: userDoc?.subscription?.plan || 'Free Plan' });
    setImmediate(() => {
      dispatchEmail(emailEvent._id, {
        to: email,
        subject: 'Welcome to AI LEGAL™',
        html
      }).catch(err => console.error('[USER-LIFECYCLE] Welcome email background dispatch error:', err));
    });

  } catch (err) {
    console.error(`[USER-LIFECYCLE] handleNewUserRegistration error for ${email}:`, err.message);
  }
};

/**
 * Evaluates all Free Plan features for a user, returning arrays of exhausted vs available features.
 */
export const getFreePlanFeaturePartition = async (userId) => {
  const allPlanLimits = await FeatureAccessManager.getDynamicPlanLimits();
  const freeLimits = allPlanLimits.FREE || FeatureAccessManager.PLAN_LIMITS.FREE;

  // Features tracked under the Free Plan tier (excluding cases which is tracked by Project model count)
  const applicableKeys = Object.keys(freeLimits).filter(k => k !== 'cases' && freeLimits[k] !== Infinity && freeLimits[k] > 0);

  const usageRecords = await PlanUsage.find({
    userId,
    feature: { $in: applicableKeys }
  });

  const usageMap = new Map();
  usageRecords.forEach(r => {
    usageMap.set(r.feature, r.usedCount || 0);
  });

  const exhaustedFeatures = [];
  const availableFeatures = [];

  for (const featureKey of applicableKeys) {
    const limit = freeLimits[featureKey];
    const used = usageMap.get(featureKey) || 0;
    const remaining = Math.max(0, limit - used);
    const featureName = getFeatureDisplayName(featureKey);

    if (remaining === 0 || used >= limit) {
      exhaustedFeatures.push({
        featureId: featureKey,
        featureName,
        used,
        limit
      });
    } else {
      availableFeatures.push({
        featureId: featureKey,
        featureName,
        remaining,
        limit
      });
    }
  }

  return {
    applicableKeys,
    exhaustedFeatures,
    availableFeatures,
    isFullyExhausted: availableFeatures.length === 0 && exhaustedFeatures.length > 0
  };
};

/**
 * Evaluates feature exhaustion at the exact moment a feature transitions from remaining > 0 to remaining == 0.
 * Idempotent: triggers at most once per feature and once for final Free Plan exhaustion per billing cycle.
 */
export const checkAndTriggerFeatureExhaustion = async (userId, normalizedFeature, newUsedCount, limit, plan = 'FREE') => {
  // Only evaluate Free Plan (or tiers with finite limits)
  if (!userId || plan !== 'FREE' || limit === Infinity) return;

  // Critical condition: Trigger ONLY at the exact moment limit is reached (newUsedCount === limit)
  if (newUsedCount !== limit) return;

  try {
    const user = await User.findById(userId);
    if (!user || user.role === 'SUPER_ADMIN') return;

    const email = (user.email || '').toLowerCase().trim();
    if (!email) return;

    const name = user.name || user.fullName || email.split('@')[0];
    const featureName = getFeatureDisplayName(normalizedFeature);
    const usagePeriodId = user.subscription?.expiryDate 
      ? `cycle_${new Date(user.subscription.expiryDate).toISOString().slice(0, 7)}`
      : 'initial_cycle';

    // 1. Calculate current dynamic state across ALL Free Plan features
    const partition = await getFreePlanFeaturePartition(userId);
    const { exhaustedFeatures, availableFeatures, isFullyExhausted } = partition;

    // 2. Feature Limit Exhausted Email (Single / Multiple)
    const featureIdempotencyKey = `${userId.toString()}_${plan}_${usagePeriodId}_${normalizedFeature}_LIMIT_EXHAUSTED`;

    let featureEvent;
    try {
      featureEvent = await EmailEvent.create({
        userId,
        name,
        email,
        accountCreatedAt: user.createdAt,
        currentPlan: plan,
        eventType: 'FEATURE_LIMIT_EXHAUSTED',
        featureId: normalizedFeature,
        featureName,
        featureLimit: limit,
        featureUsage: newUsedCount,
        remainingLimit: 0,
        exhaustedFeatures,
        availableFeatures,
        emailSubject: `Your ${featureName} Free Limit Has Been Reached`,
        emailStatus: 'PENDING',
        platform: user.deviceOS || 'unknown',
        authenticationMethod: user.signupMethod || 'email',
        idempotencyKey: featureIdempotencyKey,
        usagePeriodId
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        // Already notified for this feature in this period
        featureEvent = null;
      } else {
        console.error('[USER-LIFECYCLE] Error creating feature exhaustion EmailEvent:', dupErr);
      }
    }

    if (featureEvent) {
      console.log(`[FEATURE-LIMIT] EXHAUSTED: ${normalizedFeature} for ${email} (Used: ${newUsedCount}/${limit}). Dispatching notification...`);
      const html = getFeatureExhaustedEmailHtml({
        name,
        featureName,
        featureLimit: limit,
        exhaustedFeatures,
        availableFeatures
      });

      setImmediate(() => {
        dispatchEmail(featureEvent._id, {
          to: email,
          subject: `Your ${featureName} Free Limit Has Been Reached`,
          html
        }).catch(err => console.error('[USER-LIFECYCLE] Feature exhaustion email background dispatch error:', err));
      });
    }

    // 3. Final Free Plan Fully Exhausted Check
    if (isFullyExhausted) {
      const finalIdempotencyKey = `${userId.toString()}_${plan}_${usagePeriodId}_FREE_PLAN_FULLY_EXHAUSTED`;

      let finalEvent;
      try {
        finalEvent = await EmailEvent.create({
          userId,
          name,
          email,
          accountCreatedAt: user.createdAt,
          currentPlan: plan,
          eventType: 'FREE_PLAN_FULLY_EXHAUSTED',
          featureLimit: limit,
          featureUsage: newUsedCount,
          remainingLimit: 0,
          exhaustedFeatures,
          availableFeatures: [],
          emailSubject: 'Your AI LEGAL™ Free Plan Limits Have Been Reached',
          emailStatus: 'PENDING',
          platform: user.deviceOS || 'unknown',
          authenticationMethod: user.signupMethod || 'email',
          idempotencyKey: finalIdempotencyKey,
          usagePeriodId
        });
      } catch (dupErr) {
        if (dupErr.code === 11000) {
          finalEvent = null;
        } else {
          console.error('[USER-LIFECYCLE] Error creating final plan exhaustion EmailEvent:', dupErr);
        }
      }

      if (finalEvent) {
        console.log(`[FREE-PLAN] FULLY_EXHAUSTED for ${email}. All free limits reached. Dispatching final upgrade email...`);
        await User.findByIdAndUpdate(userId, {
          $set: {
            lifecycleStage: 'free_fully_exhausted',
            finalExhaustionEmailSent: true,
            finalExhaustionEmailSentAt: new Date()
          }
        });

        const finalHtml = getFreePlanFullyExhaustedEmailHtml({
          name,
          exhaustedFeatures
        });

        setImmediate(() => {
          dispatchEmail(finalEvent._id, {
            to: email,
            subject: 'Your AI LEGAL™ Free Plan Limits Have Been Reached',
            html: finalHtml
          }).catch(err => console.error('[USER-LIFECYCLE] Final plan exhaustion email background dispatch error:', err));
        });
      }
    }

  } catch (err) {
    console.error(`[USER-LIFECYCLE] checkAndTriggerFeatureExhaustion error for user ${userId}:`, err.message);
  }
};

/**
 * Calculates start and end dates based on standard admin filter strings.
 */
export const resolveDateRange = (range = 'all') => {
  const now = new Date();
  let startDate = null;
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (String(range).toLowerCase().trim()) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case '7d':
    case 'last 7 days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    case 'last 30 days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '60d':
    case 'last 60 days':
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
    case 'last 90 days':
    case 'last 3 months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
    case 'last 6 months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '9m':
    case 'last 9 months':
      startDate = new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
    case 'last 1 year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      startDate = null;
      break;
  }

  return { startDate, endDate };
};

/**
 * Aggregates User Lifecycle metrics & reports based on persistent database audit logs.
 */
export const getLifecycleReportData = async (dateRange = 'all') => {
  const { startDate, endDate } = resolveDateRange(dateRange);
  const userQuery = {};
  const eventQuery = {};

  if (startDate) {
    userQuery.createdAt = { $gte: startDate, $lte: endDate };
    eventQuery.createdAt = { $gte: startDate, $lte: endDate };
  }

  const [users, events] = await Promise.all([
    User.find(userQuery).sort({ createdAt: -1 }).lean(),
    EmailEvent.find(eventQuery).sort({ createdAt: -1 }).lean()
  ]);

  // Aggregate user metrics
  let welcomeSentCount = 0;
  let featureExhaustedEmailsCount = 0;
  let finalExhaustedEmailsCount = 0;
  let emailFailedCount = 0;

  events.forEach(e => {
    if (e.eventType === 'WELCOME_EMAIL' && e.emailStatus === 'SENT') welcomeSentCount++;
    if (e.eventType === 'FEATURE_LIMIT_EXHAUSTED' && e.emailStatus === 'SENT') featureExhaustedEmailsCount++;
    if (e.eventType === 'FREE_PLAN_FULLY_EXHAUSTED' && e.emailStatus === 'SENT') finalExhaustedEmailsCount++;
    if (e.emailStatus === 'FAILED') emailFailedCount++;
  });

  // Map latest email and exhausted features per user
  const userEventMap = new Map();
  events.forEach(e => {
    const uid = e.userId?.toString();
    if (!uid) return;
    if (!userEventMap.has(uid)) {
      userEventMap.set(uid, []);
    }
    userEventMap.get(uid).push(e);
  });

  const usersList = users.map(u => {
    const uid = u._id.toString();
    const userEvents = userEventMap.get(uid) || [];
    const latestEvent = userEvents[0] || null;

    const featureEvents = userEvents.filter(e => e.eventType === 'FEATURE_LIMIT_EXHAUSTED');
    const exhaustedFeatureNames = [...new Set(featureEvents.map(e => e.featureName || e.featureId))];

    return {
      userId: uid,
      name: u.name || u.fullName || 'User',
      email: u.email,
      createdAt: u.createdAt,
      plan: u.subscription?.plan || 'FREE',
      platform: u.signupPlatform || u.deviceOS || 'web',
      signupMethod: u.signupMethod || 'email',
      welcomeEmailSent: u.welcomeEmailSent || userEvents.some(e => e.eventType === 'WELCOME_EMAIL' && e.emailStatus === 'SENT'),
      welcomeEmailDate: u.welcomeEmailSentAt || null,
      exhaustedFeatures: exhaustedFeatureNames,
      lastFeatureLimitEmail: featureEvents[0]?.createdAt || null,
      freePlanFullyExhausted: u.finalExhaustionEmailSent || userEvents.some(e => e.eventType === 'FREE_PLAN_FULLY_EXHAUSTED'),
      lastEmailSent: latestEvent ? latestEvent.eventType : 'None',
      lastEmailDate: latestEvent ? latestEvent.createdAt : null,
      lastEmailStatus: latestEvent ? latestEvent.emailStatus : 'N/A'
    };
  });

  return {
    metrics: {
      totalUsers: users.length,
      welcomeSentCount,
      featureExhaustedEmailsCount,
      finalExhaustedEmailsCount,
      emailFailedCount,
      activeDateRange: dateRange
    },
    users: usersList,
    events
  };
};

/**
 * Generates a two-sheet Excel Workbook (.xlsx Buffer) from the database audit records.
 * Sheet 1: Users Lifecycle Overview
 * Sheet 2: Email Audit Logs
 */
export const generateLifecycleExcelBuffer = async (dateRange = 'all') => {
  const { users, events } = await getLifecycleReportData(dateRange);

  // Sheet 1 Data — Users
  const userRows = users.map(u => ({
    'User Name': u.name,
    'Email Address': u.email,
    'Account Created Date': u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN') : 'N/A',
    'Current Plan': u.plan,
    'Platform': (u.platform || 'web').toUpperCase(),
    'Signup Method': (u.signupMethod || 'email').toUpperCase(),
    'Welcome Email Sent': u.welcomeEmailSent ? 'YES' : 'NO',
    'Welcome Email Date': u.welcomeEmailDate ? new Date(u.welcomeEmailDate).toLocaleString('en-IN') : 'N/A',
    'Exhausted Features': u.exhaustedFeatures.length > 0 ? u.exhaustedFeatures.join(', ') : 'None',
    'Last Feature Limit Email': u.lastFeatureLimitEmail ? new Date(u.lastFeatureLimitEmail).toLocaleString('en-IN') : 'N/A',
    'Free Plan Fully Exhausted': u.freePlanFullyExhausted ? 'YES' : 'NO',
    'Last Email Sent': u.lastEmailSent,
    'Last Email Date': u.lastEmailDate ? new Date(u.lastEmailDate).toLocaleString('en-IN') : 'N/A',
    'Last Email Status': u.lastEmailStatus
  }));

  // Sheet 2 Data — Email Audit Logs
  const eventRows = events.map(e => ({
    'Event ID': e._id ? e._id.toString() : 'N/A',
    'User ID': e.userId ? e.userId.toString() : 'N/A',
    'User Name': e.name || 'N/A',
    'Email Address': e.email,
    'Event Type': e.eventType,
    'Feature Name': e.featureName || 'N/A',
    'Feature Limit': e.featureLimit !== null && e.featureLimit !== undefined ? e.featureLimit : 'N/A',
    'Feature Usage': e.featureUsage !== null && e.featureUsage !== undefined ? e.featureUsage : 'N/A',
    'Email Subject': e.emailSubject || 'N/A',
    'Status': e.emailStatus,
    'Sent At': e.sentAt ? new Date(e.sentAt).toLocaleString('en-IN') : 'N/A',
    'Failure Reason': e.failureReason || 'None',
    'Platform': (e.platform || 'unknown').toUpperCase(),
    'Signup Method': (e.authenticationMethod || 'email').toUpperCase(),
    'Idempotency Key': e.idempotencyKey
  }));

  const wb = XLSX.utils.book_new();

  const wsUsers = XLSX.utils.json_to_sheet(userRows);
  XLSX.utils.book_append_sheet(wb, wsUsers, 'Users Lifecycle');

  const wsEvents = XLSX.utils.json_to_sheet(eventRows);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Email Audit Logs');

  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

export default {
  handleNewUserRegistration,
  checkAndTriggerFeatureExhaustion,
  getFreePlanFeaturePartition,
  getLifecycleReportData,
  generateLifecycleExcelBuffer,
  dispatchEmail,
  getFeatureDisplayName,
  FEATURE_DISPLAY_NAMES
};
