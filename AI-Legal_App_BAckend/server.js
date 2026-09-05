import express, { urlencoded } from "express";
import cors from "cors";
import 'dotenv/config';
import fs from 'fs';

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn(`[server.js] ⚠️ Removing invalid GOOGLE_APPLICATION_CREDENTIALS path: "${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

import connectDB from "./config/db.js";
import chatRoutes from "./routes/chatRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import ssoRoutes from "./routes/ssoRoutes.js";
import cookieParser from "cookie-parser";
import emailVerification from "./routes/emailVerification.js"
import userRoute from './routes/user.js'
import path from 'path';
import { fileURLToPath } from 'url';
import { initSocket } from './utils/socket.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import chatRoute from './routes/chat.routes.js';
import knowledgeRoute from './routes/knowledge.routes.js';
// import aibaseRoutes from './routes/aibaseRoutes.js'; // Removed
// import * as aibaseService from './services/aibaseService.js'; // Removed

import notificationRoutes from "./routes/notificationRoutes.js";
import supportRoutes from './routes/supportRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import workspaceActivityRoutes from './routes/workspaceActivityRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import legalRoutes from './Tools/AI_Legal/routes/legalPages.routes.js';
import intentRoutes from './routes/intentRoutes.js';
import mediaProxyRoutes from './routes/mediaProxy.routes.js';
import legalToolkitRoutes from './Tools/AI_Legal/legalToolkit.routes.js';
import connectorsRoutes from './routes/connectors.routes.js';
import precedentsRoutes from './Tools/AI_Legal/routes/precedents.routes.js';
import friendChatRoutes from './routes/friendChatRoutes.js';
import chatsRoutes from './routes/chats.js';
import messagesRoutes from './routes/messages.js';
import contractAnalysisRoutes from './routes/contractAnalysisRoutes.js';
import casePredictionRoutes from './routes/casePredictionRoutes.js';
import strategyHistoryRoutes from './routes/strategyHistoryRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import adminSettingsRoutes from './routes/adminSettingsRoutes.js';
import featureRequestRoutes from './routes/featureRequestRoutes.js';
import bugReportRoutes from './routes/bugReportRoutes.js';
import courtOrderRoutes from './routes/courtOrderRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import studentNoteRoutes from './routes/studentNoteRoutes.js';
import appUpdateRoutes from './routes/appUpdateRoutes.js';
import enterpriseRoutes from './routes/enterpriseRoutes.js';

import { startPlanExpiryService } from './services/planExpiryService.js';
import { langMiddleware } from './middleware/langContext.js';

// End of standard imports

const app = express();
const PORT = process.env.PORT || 8080;





// Connect to Database
connectDB().then(async () => {
  console.log("Database connection attempt finished, initializing services...");
  try {
    const { initializeConfigs } = await import('./services/configService.js');
    await initializeConfigs();

    const { seedAdminData } = await import('./utils/adminSeeder.js');
    await seedAdminData();

    // Self-healing migration for RAG / Product Guide files categorized incorrectly as GENERAL
    try {
      const Knowledge = (await import('./models/Knowledge.model.js')).default;
      const updateResult = await Knowledge.updateMany(
        { filename: /rag|product|guide/i, category: 'GENERAL' },
        { $set: { category: 'PRODUCT_GUIDE' } }
      );
      if (updateResult.modifiedCount > 0) {
        console.log(`✅ Self-healed ${updateResult.modifiedCount} knowledge base documents to PRODUCT_GUIDE category.`);
      }
    } catch (migErr) {
      console.warn("Self-healing migration failed:", migErr.message);
    }

    const { initializeFromDB } = await import('./services/ai.service.js');
    await initializeFromDB();
    console.log("✅ AI Services (Embeddings & Vector Store) pre-initialized.");

    // Initialize Automatic Knowledge Update System (Crawler Scheduler)
    const { initScheduler } = await import('./services/scheduler.service.js');
    initScheduler();

    // Initialize Multi Schedule Reminder System
    const { initReminderScheduler } = await import('./services/reminderScheduler.js');
    initReminderScheduler();

    // Initialize Plan Expiry Notification System
    startPlanExpiryService();


  } catch (err) {
    console.error("❌ Failed to pre-initialize AI services:", err.message);
  }
}).catch(error => {
  console.error("Database connection failed during startup:", error);
});


// Middleware

// HTTP Security Headers & CORS Middleware (BSA-006, MSA-012, P0-04)
const STATIC_CORS_ORIGINS = [
  'https://uwo24.com',
  'https://www.uwo24.com',
  'https://aisa.uwo24.com',
  'https://ailegal.aisa24.com',
  'https://www.ailegal.aisa24.com',
  'https://api.ailegal.com',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:19006',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000'
];

const ALLOWED_DOMAIN_PATTERNS = [
  /\.uwo24\.com$/,
  /\.aisa24\.com$/,
  /\.run\.app$/,
  /\.vercel\.app$/,
  /\.netlify\.app$/,
  /\.pages\.dev$/
];

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  
  // 1. Check static whitelist
  if (STATIC_CORS_ORIGINS.includes(origin)) return true;

  // 2. Check process.env.ALLOWED_CORS_ORIGINS or CLIENT_URL
  const envOrigins = (process.env.ALLOWED_CORS_ORIGINS || process.env.CLIENT_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  if (envOrigins.includes(origin)) return true;

  // 3. Check domain patterns
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (ALLOWED_DOMAIN_PATTERNS.some(pattern => pattern.test(hostname))) {
      return true;
    }
  } catch (e) {
    // invalid URL format
  }

  // 4. In development allow any origin
  if (process.env.NODE_ENV !== 'production') return true;

  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  const requestHeaders = req.headers['access-control-request-headers'];
  if (requestHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization, Accept, accept, X-Requested-With, x-requested-with, x-device-fingerprint, X-Device-Fingerprint, x-device-id, X-Device-Id, x-device-name, X-Device-Name, x-device-platform, X-Device-Platform, x-app-version, X-App-Version, Origin, origin, X-App-Language, x-app-language, X-App-Locale, x-app-locale, x-active-workspace-id, X-Active-Workspace-Id, x-user-role, X-User-Role, x-workspace-type, X-Workspace-Type, x-workspace-id, X-Workspace-Id, X-Client-Version, x-client-version, X-Platform, *');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: '*',
  optionsSuccessStatus: 200
}));
app.use(cookieParser())
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(langMiddleware);

// Vibrant Express HTTP Request Logger Middleware for Terminal Debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const methodStr = req.method === 'POST' ? '🟢 POST' : req.method === 'GET' ? '🔵 GET' : `🟡 ${req.method}`;
    console.log(`[HTTP LOG] ${methodStr} ${req.originalUrl} -> Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});
// app.use(fileUpload()); // Removed to avoid conflict with Multer (New AIBASE)


// Serve static frontend files from 'public' directory with no-cache on HTML
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Serve Standalone AI Legal Pricing Subscription Web Portal
app.get(['/legal-pricing', '/subscription-checkout'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pricing', 'index.html'));
});

// ─── Apple Pay Domain Verification ───────────────────────────────────────────
// Apple's servers verify your domain by accessing this exact URL
// File must be placed at: Aisa_backend_beta/public/.well-known/apple-developer-merchantid-domain-association
const serveAppleVerification = (req, res) => {
  let filePath = path.join(__dirname, 'public', '.well-known', 'apple-developer-merchantid-domain-association');
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', '.well-known', 'apple-developer-merchantid-domain-association.txt');
  }
  
  if (fs.existsSync(filePath)) {
    // Apple Pay verification file is a binary DER PKCS#7 signature
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath);
  } else {
    res.status(404).send('Apple Pay domain verification file not found. Please add it to public/.well-known/');
  }
};

app.get('/.well-known/apple-developer-merchantid-domain-association.txt', serveAppleVerification);
app.get('/.well-known/apple-developer-merchantid-domain-association', serveAppleVerification);


// API Health Check (moved from root)
app.get("/api/health", (req, res) => {
  res.send("All working")
})
// Global Debug middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[REQUEST] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// --- API Routes Registration ---

// Auth & User
app.use('/api/auth/verify-email', emailVerification);
app.use('/api/auth', authRoutes);
app.use('/api/auth/sso', ssoRoutes);
app.use('/api/user', userRoute);
app.use('/api/user', dataRoutes);  // GDPR data deletion & export
app.use('/api/legal', legalRoutes);
app.use('/api/legal-toolkit', legalToolkitRoutes);
app.use('/api/contract-analysis', contractAnalysisRoutes);
app.use('/api/case-predictions', casePredictionRoutes);
app.use('/api/strategy-history', strategyHistoryRoutes);
app.use('/api/security', securityRoutes);

// Intelligence Features
app.use('/api/precedents', precedentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/voice', voiceRoutes);
// Intent Routing & Orchestration System
app.use('/api/intent', intentRoutes);
// Utility & Support
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/connectors', connectorsRoutes);

// Business & Dashboard
app.use('/api/pricing', pricingRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/enterprise', enterpriseRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/media', mediaProxyRoutes);
app.use('/api/friends', friendChatRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', userRoute); // Aliased users routes to same user controller



// Admin Panel (Admin only)
app.use('/api/admin', adminRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/feature-requests', featureRequestRoutes);
app.use('/api/admin/bug-reports', bugReportRoutes);

// Public / User access submissions
app.use('/api/app-update', appUpdateRoutes);
app.use('/api/feature-requests', featureRequestRoutes);
app.use('/api/bug-reports', bugReportRoutes);

// Knowledge Base
app.use('/api/knowledge', knowledgeRoute);

// Projects
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspace-activities', workspaceActivityRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/court-orders', courtOrderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/student-notes', studentNoteRoutes);
// Cases alias (same router — /api/cases/:id/auto-analyze maps to /:id/analyze)
app.use('/api/cases', projectRoutes);

// Broad Fallbacks (should be last and as specific as possible)
app.use('/api/public', chatRoutes); // Allow /api/public/share/...


// AIBASE (V3) - With Credit System
const { verifyToken } = await import('./middleware/authorization.js');
const { creditMiddleware } = await import('./middleware/creditSystem.js');

app.use('/api/aibase/chat', verifyToken, creditMiddleware, chatRoute);
app.use('/api/aibase/knowledge', verifyToken, creditMiddleware, knowledgeRoute);

// --- End of Routes ---

// SPA Catch-all to serve index.html for unknown non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Catch-all 404 for API routes
app.use((req, res) => {
  console.warn(`[404 NOT MATCHED] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl
  });
});

// Global Error Handler & Crash Logger
app.use(async (err, req, res, next) => {
  console.error("[SERVER ERROR]", err.stack);
  try {
    const CrashLog = (await import('./models/CrashLog.js')).default;
    await CrashLog.create({
      errorName: err.name || 'ServerError',
      message: err.message || 'Internal Server Error',
      stack: err.stack || '',
      source: 'backend',
      platform: 'NodeServer',
      userId: req.user ? (req.user.id || req.user._id) : null,
      userEmail: req.user ? req.user.email : '',
      route: `${req.method} ${req.originalUrl}`,
      severity: 'CRITICAL',
      status: 'UNRESOLVED',
      metadata: { query: req.query }
    });
  } catch (logErr) {
    console.error('[CrashLog Save Error]', logErr.message);
  }
  if (!res.headersSent) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: isProd ? 'An unexpected server error occurred. Please try again.' : err.message
    });
  }
});

// Start listening
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`AISA Backend running on http://localhost:${PORT} and http://0.0.0.0:${PORT} [Connected to AISA DB]`);
});

// --- WebSockets ---
const io = initSocket(server);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});


server.timeout = 900000; // 15 mins


// Keep process alive for local development
setInterval(() => { }, 1000 * 60 * 60); // Keep alive process
// trigger restart: static assets copied

