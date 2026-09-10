import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcHtmlPath = path.resolve(__dirname, '../../AI-Legal_App_Webapp/index.html');
const publicHtmlPath = path.resolve(__dirname, '../public/index.html');
const mobileAppPagePath = path.resolve(__dirname, '../../AI-Legal_App_Webapp/src/pages/MobileAppPage.jsx');

console.log('================================================================');
console.log('🔍 SEO, OPEN GRAPH, TWITTER CARDS & SCHEMA.ORG AUDIT TEST SUITE');
console.log('================================================================');

function validateHtmlFile(targetPath, label) {
  console.log(`\n📄 Testing ${label}: ${targetPath}`);
  assert(fs.existsSync(targetPath), `File must exist at ${targetPath}`);
  const htmlContent = fs.readFileSync(targetPath, 'utf8');

  // Extract all <script type="application/ld+json">...</script>
  const jsonLdRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  const schemas = [];
  let match;
  while ((match = jsonLdRegex.exec(htmlContent)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      schemas.push(parsed);
    } catch (e) {
      assert.fail(`Invalid JSON inside <script type="application/ld+json"> in ${label}: ${e.message}`);
    }
  }

  console.log(`  📌 Found ${schemas.length} JSON-LD schema blocks`);
  assert(schemas.length >= 3, `Expected at least 3 JSON-LD schema blocks (Org, SoftwareApp, FAQ) in ${label}`);

  // 1. Validate Organization schema with explicit app store links
  const org = schemas.find(s => s['@type'] === 'Organization');
  assert(org, `Must contain a schema of @type: "Organization" in ${label}`);
  assert.strictEqual(org['@context'], 'https://schema.org');
  assert.strictEqual(org.name, 'AI LEGAL™');
  assert(Array.isArray(org.sameAs), 'Organization.sameAs must be an array');
  
  const hasPlayStore = org.sameAs.some(url => url.includes('play.google.com'));
  const hasAppStore = org.sameAs.some(url => url.includes('apple.com'));
  assert(hasPlayStore, `Organization.sameAs must include Google Play Store URL in ${label}`);
  assert(hasAppStore, `Organization.sameAs must include Apple App Store URL in ${label}`);
  assert(org.contactPoint && org.contactPoint.length > 0, `Organization must have contactPoint in ${label}`);
  console.log('  ✅ Organization Schema with Play Store & App Store links: 100% Valid');

  // 2. Validate SoftwareApplication schema
  const softApp = schemas.find(s => s['@type'] === 'SoftwareApplication');
  assert(softApp, `Must contain a schema of @type: "SoftwareApplication" in ${label}`);
  assert.strictEqual(softApp['@context'], 'https://schema.org');
  assert.strictEqual(softApp.name, 'AI LEGAL™');
  assert(softApp.operatingSystem, 'operatingSystem must be defined');
  assert(softApp.applicationCategory, 'applicationCategory must be defined');
  assert(softApp.description && softApp.description.length > 50, 'description must be descriptive');
  assert(softApp.offers, 'offers must be defined for Google Rich Results');
  assert(softApp.aggregateRating, 'aggregateRating must be defined for Star Ratings in Google SERP');
  assert.strictEqual(softApp.aggregateRating['@type'], 'AggregateRating');
  assert(Number(softApp.aggregateRating.ratingValue) >= 4.0, 'ratingValue must be positive');
  assert(Number(softApp.aggregateRating.ratingCount) > 100, 'ratingCount must be positive');
  assert(softApp.author && softApp.author.name, 'author organization must be defined');
  console.log('  ✅ SoftwareApplication Schema: 100% Valid');

  // 3. Validate FAQPage schema
  const faqPage = schemas.find(s => s['@type'] === 'FAQPage');
  assert(faqPage, `Must contain a schema of @type: "FAQPage" in ${label}`);
  assert.strictEqual(faqPage['@context'], 'https://schema.org');
  assert(Array.isArray(faqPage.mainEntity), 'mainEntity must be an array of questions');
  assert(faqPage.mainEntity.length >= 5, `Expected at least 5 FAQ questions in ${label}`);

  faqPage.mainEntity.forEach((item) => {
    assert.strictEqual(item['@type'], 'Question');
    assert(item.name && item.name.length > 5);
    assert(item.acceptedAnswer);
    assert.strictEqual(item.acceptedAnswer['@type'], 'Answer');
    assert(item.acceptedAnswer.text && item.acceptedAnswer.text.length > 10);
  });
  console.log(`  ✅ FAQPage Schema: 100% Valid (${faqPage.mainEntity.length} Q&As)`);

  // 4. Validate Open Graph Meta Tags
  assert(htmlContent.includes('<meta property="og:title"'), `Missing og:title in ${label}`);
  assert(htmlContent.includes('<meta property="og:description"'), `Missing og:description in ${label}`);
  assert(htmlContent.includes('<meta property="og:image"'), `Missing og:image in ${label}`);
  assert(htmlContent.includes('<meta property="og:url"'), `Missing og:url in ${label}`);
  assert(htmlContent.includes('<meta property="og:type" content="website"'), `Missing og:type in ${label}`);
  console.log('  ✅ Open Graph (og:*) Meta Tags: 100% Valid');

  // 5. Validate Twitter Card Meta Tags
  assert(htmlContent.includes('<meta name="twitter:card" content="summary_large_image"'), `Missing twitter:card in ${label}`);
  assert(htmlContent.includes('<meta name="twitter:title"'), `Missing twitter:title in ${label}`);
  assert(htmlContent.includes('<meta name="twitter:description"'), `Missing twitter:description in ${label}`);
  assert(htmlContent.includes('<meta name="twitter:image"'), `Missing twitter:image in ${label}`);
  assert(htmlContent.includes('<meta name="twitter:site"'), `Missing twitter:site in ${label}`);
  console.log('  ✅ Twitter Card Meta Tags: 100% Valid');
}

function validateAppDownloadHierarchy() {
  console.log(`\n📄 Testing Heading Hierarchy on App Download Page: ${mobileAppPagePath}`);
  assert(fs.existsSync(mobileAppPagePath), `MobileAppPage.jsx must exist at ${mobileAppPagePath}`);
  const content = fs.readFileSync(mobileAppPagePath, 'utf8');

  // Count H1 tags
  const h1Matches = content.match(/<h1[\s>]/g) || [];
  assert.strictEqual(h1Matches.length, 1, `MobileAppPage must have exactly ONE <h1> heading, found: ${h1Matches.length}`);
  console.log('  ✅ Single <h1> heading confirmed');

  // Verify H2 tags
  const h2Matches = content.match(/<h2[\s>]/g) || [];
  assert(h2Matches.length >= 3, `Expected at least 3 <h2> section headings, found: ${h2Matches.length}`);
  console.log(`  ✅ ${h2Matches.length} <h2> section headings confirmed`);

  // Verify H3 tags
  const h3Matches = content.match(/<h3[\s>]/g) || [];
  assert(h3Matches.length >= 1, `Expected <h3> sub-headings, found: ${h3Matches.length}`);
  console.log(`  ✅ ${h3Matches.length} <h3> sub-headings confirmed`);
}

function runValidation() {
  validateHtmlFile(srcHtmlPath, 'Source index.html (Webapp)');
  validateHtmlFile(publicHtmlPath, 'Production index.html (Backend public)');
  validateAppDownloadHierarchy();

  console.log('\n================================================================');
  console.log('🎉 ALL 4 AUDIT REQUIREMENTS PASSED! 100% READY FOR DEPLOYMENT');
  console.log('================================================================');
}

runValidation();
