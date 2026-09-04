import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const testResults = [];

async function runWebappAudit() {
  console.log('=== Starting Headless Browser Scraping & Tab Crash Audit ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { url: 'http://127.0.0.1:5173/splash', name: 'Splash Screen', auth: false },
    { url: 'http://127.0.0.1:5173/onboarding', name: 'Onboarding Flow', auth: false },
    { url: 'http://127.0.0.1:5173/login', name: 'Login Page', auth: false },
    { url: 'http://127.0.0.1:5173/signup', name: 'Signup Page', auth: false },
    { url: 'http://127.0.0.1:5173/pricing', name: 'Public Pricing Page', auth: false },
    { url: 'http://127.0.0.1:5173/legal-pricing', name: 'Legal Pricing Portal', auth: false },
    { url: 'http://127.0.0.1:5173/privacy-policy', name: 'Privacy Policy', auth: false },
    { url: 'http://127.0.0.1:5173/terms', name: 'Terms of Service', auth: false },
    { url: 'http://127.0.0.1:5173/cookie-policy', name: 'Cookie Policy', auth: false },
    { url: 'http://127.0.0.1:5173/dashboard/chat/new', name: 'AI Legal Assistant & Strategy Chat', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/cases', name: 'My Matters & Case Workspace', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/tools', name: 'AI Tools Catalog', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/settings', name: 'Profile & Settings', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/help-support', name: 'Help & Support Center', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/security', name: 'Security & Compliance Guidelines', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/admin', name: 'Super Admin Console', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/knowledge-vault', name: 'Knowledge Vault (Placeholder)', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/court-diary', name: 'Court Diary (Placeholder)', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/templates', name: 'Templates Hub (Placeholder)', auth: true },
    { url: 'http://127.0.0.1:5173/dashboard/calculator', name: 'Legal Calculator (Placeholder)', auth: true }
  ];

  // First seed local storage with test admin token
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YjcyMzkxYjRhMWIwMmNmYmExOTIzNCIsIl9pZCI6IjY3YjcyMzkxYjRhMWIwMmNmYmExOTIzNCIsImVtYWlsIjoiYWRtaW5AdXdvMjQuY29tIiwicm9sZSI6IlNVUEVSX0FETUlOIiwibmFtZSI6IkF1ZGl0b3IgQWRtaW4iLCJwaG9uZSI6Iis5MTk4NzY1NDMyMTAiLCJzdWJzY3JpcHRpb24iOnsic3RhdHVzIjoiYWN0aXZlIiwicGxhbiI6IkFJIExlZ2FsIEVudGVycHJpc2UiLCJ0aWVyIjoiZW50ZXJwcmlzZSIsImV4cGlyZXNBdCI6IjIwMjctMDgtMjZUMDc6MDQ6NDUuOTQ2WiJ9LCJjcmVkaXRzIjo5OTk5OSwiaWF0IjoxNzg3NzI3ODg1LCJleHAiOjE3ODgzMzI2ODV9.svmh5dLVLIk7ZSRrfls3RZKN_wbgzCbsySONA3VmT7k";
    const user = {
      id: "67b72391b4a1b02cfba19234",
      _id: "67b72391b4a1b02cfba19234",
      email: "admin@uwo24.com",
      role: "SUPER_ADMIN",
      name: "Auditor Admin",
      phone: "+919876543210",
      subscription: {
        status: "active",
        plan: "AI Legal Enterprise",
        tier: "enterprise",
        expiresAt: "2027-08-26T07:04:45.946Z"
      },
      credits: 99999,
      token: token
    };

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('accounts', JSON.stringify([user]));
    localStorage.setItem('activeWorkspaceId', 'personal_practice');
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('aisa_has_completed_onboarding', 'true');
  });

  for (const r of routes) {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    console.log(`Auditing Route: ${r.name} (${r.url})...`);
    try {
      const response = await page.goto(r.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => null);
      
      // Wait 500ms for animations and Suspense lazy loaders
      await new Promise(res => setTimeout(res, 600));

      const pageState = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const isCrashed = text.includes('Application Error') || 
                          text.includes('Something went wrong') || 
                          text.includes('Minified React error');
        
        const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean);
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim()).filter(Boolean);
        const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => i.getAttribute('placeholder') || i.getAttribute('name') || i.tagName);

        return {
          currentUrl: window.location.href,
          title: document.title,
          isCrashed,
          buttonsCount: buttons.length,
          buttonsSample: buttons.slice(0, 8),
          headingsSample: headings.slice(0, 6),
          inputsCount: inputs.length,
          bodySnippet: text.slice(0, 200).replace(/\s+/g, ' ')
        };
      });

      const status = (pageErrors.length > 0 || pageState.isCrashed) ? 'FAILED' : 'PASSED';

      testResults.push({
        name: r.name,
        targetUrl: r.url,
        actualUrl: pageState.currentUrl,
        status,
        pageErrors,
        headings: pageState.headingsSample,
        buttonsCount: pageState.buttonsCount,
        buttonsSample: pageState.buttonsSample,
        inputsCount: pageState.inputsCount,
        bodyPreview: pageState.bodySnippet
      });

      console.log(` -> Status: ${status} | Headings: ${pageState.headingsSample.join(' | ') || 'None'}`);
    } catch (err) {
      console.error(` -> Error loading ${r.name}:`, err.message);
      testResults.push({
        name: r.name,
        targetUrl: r.url,
        status: 'CRASHED',
        error: err.message
      });
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(process.cwd(), '../audit_reports/raw_webapp_scraping_results.json'),
    JSON.stringify(testResults, null, 2)
  );

  console.log(`\n=== AUDIT FINISHED: ${testResults.length} Tabs & Routes Audited ===`);
  console.log(`Passed: ${testResults.filter(t => t.status === 'PASSED').length}`);
  console.log(`Failed: ${testResults.filter(t => t.status !== 'PASSED').length}`);
}

runWebappAudit().catch(console.error);
