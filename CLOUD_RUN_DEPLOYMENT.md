# Google Cloud Run Deployment Guide (Unified Frontend + Backend on Single Link)

This guide explains how to deploy the entire **AI-Legal-App** (both the React frontend SPA and the Express.js backend API/WebSockets) to **Google Cloud Run (GCP)** as a **single unified service** with a **single URL**.

---

## 🏗️ Architecture Overview

```
                          ┌──────────────────────────────────────────────┐
                          │         Google Cloud Run Service             │
                          │   https://ai-legal-app-xxxxx.run.app         │
                          │                 (Port 8080)                  │
                          └──────────────────────┬───────────────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │       Node.js 20 Express      │
                                 └───────┬───────────────┬───────┘
                                         │               │
                 ┌───────────────────────┴───┐       ┌───┴────────────────────────┐
                 │  Frontend Static SPA      │       │  Backend APIs & Sockets    │
                 │  • /                      │       │  • /api/*                  │
                 │  • /dashboard             │       │  • /api/auth/*             │
                 │  • /login                 │       │  • /api/socket.io (WS)     │
                 │  • /assets/*              │       │  • /api/health             │
                 └───────────────────────────┘       └────────────────────────────┘
```

- **Single URL**: Both frontend and backend share the exact same domain. No CORS issues, no separate hosting services, no latency overhead.
- **Multi-stage Docker Build**:
  - **Stage 1 (`frontend-builder`)**: Compiles `AI-Legal_App_Webapp` using Vite into optimized production chunks.
  - **Stage 2 (`runner`)**: Packages `AI-Legal_App_BAckend`, copies compiled assets into `/app/public/`, and runs Express on `PORT 8080`.
- **Automatic Routing**: Express serves static assets from `public/`, handles `/api/*` and WebSocket upgrades, and falls back to `index.html` for React client-side routing.

---

## 📋 Prerequisites

1. **Google Cloud Account** with a project created and billing enabled.
2. **Google Cloud SDK (`gcloud` CLI)** installed:
   ```bash
   gcloud --version
   ```
3. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```
4. Set your target project ID:
   ```bash
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```

---

## 🚀 Quick Deployment Options

### Option 1: Automated Script (Recommended)

#### On Windows (PowerShell):
```powershell
.\deploy-cloudrun.ps1
```

#### On macOS / Linux / Cloud Shell:
```bash
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```

---

### Option 2: Single gcloud Command

Run this command directly from the root `AI-Legal-App` directory:

```bash
gcloud run deploy ai-legal-app \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 2 \
  --memory 2Gi \
  --timeout 900 \
  --set-env-vars "NODE_ENV=production,MONGODB_ATLAS_URI=your_mongodb_atlas_uri,JWT_SECRET=your_jwt_secret_32_chars"
```

---

### Option 3: Continuous Deployment via Cloud Build

If you connect your repository to GCP Cloud Build triggers, use the provided `cloudbuild.yaml`:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

---

## 🔐 Environment Variables Reference

Configure these in the Google Cloud Console under **Cloud Run > Service > Edit & Deploy New Revision > Variables & Secrets** or via `--set-env-vars`:

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `PORT` | Auto | Injected automatically by Cloud Run | `8080` |
| `MONGODB_ATLAS_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/ai_legal_db` |
| `JWT_SECRET` | Yes | 32+ character random string for tokens | `a7f9b8c3d1e2f4...` |
| `OPENAI_API_KEY` | Optional | OpenAI API key for legal intelligence | `sk-proj-...` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key | `AIzaSy...` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay payment gateway key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay payment gateway secret | `...` |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary storage bucket name | `...` |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key | `...` |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret | `...` |
| `RESEND_API_KEY` | Optional | Resend transactional email API key | `re_...` |

> [!TIP]
> Use **Google Cloud Secret Manager** to securely store production secrets like `MONGODB_ATLAS_URI`, `JWT_SECRET`, and API keys, and reference them in Cloud Run using `--set-secrets`.

---

## 🌐 Setting Up a Custom Domain (Optional)

If you want a custom domain (e.g. `https://legal.yourdomain.com`):
1. Go to **Google Cloud Console > Cloud Run > Custom Domains**.
2. Click **Add Mapping** and select the `ai-legal-app` service.
3. Add the DNS `CNAME` or `A` records provided by Google to your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.).
4. Google will automatically provision and renew a free managed SSL certificate.

---

## 🔍 Verification & Health Checks

Once deployed, Google Cloud Run will provide your live URL (e.g. `https://ai-legal-app-xxxxx.a.run.app`).

Test the following endpoints:
1. **Frontend Landing Page**: `https://<YOUR-CLOUD-RUN-URL>/`
2. **API Health Check**: `https://<YOUR-CLOUD-RUN-URL>/api/health` (should return `All working`)
3. **SPA Navigation / Refresh**: `https://<YOUR-CLOUD-RUN-URL>/login` (should render login page directly)
4. **WebSocket Connection**: Real-time events connect automatically via `wss://<YOUR-CLOUD-RUN-URL>/api/socket.io`.
