import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { name: 'Mobile Compact (iPhone SE)', width: 375, height: 667, isMobile: true },
  { name: 'Mobile Standard (iPhone 14/15/16)', width: 390, height: 844, isMobile: true },
  { name: 'Tablet Portrait (iPad)', width: 768, height: 1024, isMobile: true },
  { name: 'Desktop Standard (Laptop)', width: 1440, height: 900, isMobile: false },
  { name: 'Widescreen HD', width: 1920, height: 1080, isMobile: false }
];

const PAGES_TO_AUDIT = [
  { url: 'http://127.0.0.1:5173/splash', name: 'Splash Screen' },
  { url: 'http://127.0.0.1:5173/onboarding', name: 'Onboarding Carousel' },
  { url: 'http://127.0.0.1:5173/login', name: 'Login Portal' },
  { url: 'http://127.0.0.1:5173/signup', name: 'Registration Page' },
  { url: 'http://127.0.0.1:5173/pricing', name: 'Pricing & Tiers Matrix' },
  { url: 'http://127.0.0.1:5173/legal-pricing', name: 'Legal Pricing Checkout' },
  { url: 'http://127.0.0.1:5173/privacy-policy', name: 'Privacy Policy' },
  { url: 'http://127.0.0.1:5173/terms', name: 'Terms of Service' },
  { url: 'http://127.0.0.1:5173/cookie-policy', name: 'Cookie Policy' },
  { url: 'http://127.0.0.1:5173/dashboard/chat/new', name: 'AI Legal Assistant & Chat Workspace' },
  { url: 'http://127.0.0.1:5173/dashboard/cases', name: 'Case Vault & Matters' },
  { url: 'http://127.0.0.1:5173/dashboard/tools', name: 'Specialized AI Tools Catalog' },
  { url: 'http://127.0.0.1:5173/dashboard/settings', name: 'User Profile & Settings' },
  { url: 'http://127.0.0.1:5173/dashboard/help-support', name: 'Help, FAQ & Support' },
  { url: 'http://127.0.0.1:5173/dashboard/security', name: 'Security & Compliance' },
  { url: 'http://127.0.0.1:5173/dashboard/admin', name: 'Admin Console' }
];

async function runUIScrapingAudit() {
  console.log('=== Starting Deep Multi-Viewport UI Layout & Visual Scraping Audit ===');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set local storage for authenticated dashboard states
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

  const detailedUIReports = [];

  for (const p of PAGES_TO_AUDIT) {
    console.log(`\n📄 Auditing UI on Page: ${p.name} (${p.url})`);
    const pageViewportResults = [];

    for (const vp of VIEWPORTS) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => null);
      await new Promise(res => setTimeout(res, 500));

      const uiMetrics = await page.evaluate((vpInfo) => {
        const docEl = document.documentElement;
        const body = document.body;

        // 1. Check Horizontal Overflow Bleed
        const hasHorizontalScroll = docEl.scrollWidth > window.innerWidth + 1 || body.scrollWidth > window.innerWidth + 1;
        const overflowPixels = Math.max(0, docEl.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth);

        // 2. Identify Overflowing Elements
        const overflowingElements = [];
        const allElements = Array.from(document.querySelectorAll('*'));
        
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth + 2 && rect.width < 10000) {
            overflowingElements.push({
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 60),
              elementWidth: Math.round(rect.width),
              viewportWidth: window.innerWidth
            });
          }
        });

        // 3. Check Interactive Element Touch Sizing (< 32px on mobile)
        const smallTouchTargets = [];
        if (vpInfo.isMobile) {
          const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
          buttons.forEach(b => {
            const rect = b.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 28 || rect.height < 28)) {
              smallTouchTargets.push({
                text: b.innerText.slice(0, 30).trim() || 'Icon Button',
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              });
            }
          });
        }

        // 4. Check Text Truncation / Clip Hazards
        const clippedTextElements = [];
        const textNodes = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, span, label'));
        textNodes.forEach(t => {
          if (t.scrollWidth > t.clientWidth + 2 && getComputedStyle(t).overflow === 'hidden' && getComputedStyle(t).textOverflow !== 'ellipsis') {
            clippedTextElements.push({
              tag: t.tagName,
              text: t.innerText.slice(0, 40).trim(),
              scrollWidth: t.scrollWidth,
              clientWidth: t.clientWidth
            });
          }
        });

        return {
          viewportName: vpInfo.name,
          viewportSize: `${vpInfo.width}x${vpInfo.height}`,
          hasHorizontalScroll,
          overflowPixels,
          overflowingElementsCount: overflowingElements.length,
          overflowingElementsSample: overflowingElements.slice(0, 3),
          smallTouchTargetsCount: smallTouchTargets.length,
          smallTouchTargetsSample: smallTouchTargets.slice(0, 3),
          clippedTextCount: clippedTextElements.length,
          layoutStatus: hasHorizontalScroll ? 'OVERFLOW_HAZARD' : (smallTouchTargets.length > 5 ? 'TOUCH_TARGET_WARN' : 'RESPONSIVE_OK')
        };
      }, vp);

      console.log(`  📱 [${vp.name}] Status: ${uiMetrics.layoutStatus} | Overflow: ${uiMetrics.overflowPixels}px | Small Touch Targets: ${uiMetrics.smallTouchTargetsCount}`);
      pageViewportResults.push(uiMetrics);
    }

    detailedUIReports.push({
      pageName: p.name,
      url: p.url,
      viewports: pageViewportResults
    });
  }

  await browser.close();

  fs.writeFileSync(
    path.join(process.cwd(), '../audit_reports/raw_ui_scraping_audit.json'),
    JSON.stringify(detailedUIReports, null, 2)
  );

  console.log('\n=== UI SCRAPING AUDIT COMPLETE ===');
  console.log('Results saved to audit_reports/raw_ui_scraping_audit.json');
}

runUIScrapingAudit().catch(console.error);
