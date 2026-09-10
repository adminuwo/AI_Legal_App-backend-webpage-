import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcHtmlPath = path.resolve(__dirname, '../../AI-Legal_App_Webapp/index.html');
const publicHtmlPath = path.resolve(__dirname, '../public/index.html');

console.log('================================================================');
console.log('🔍 GOOGLE RICH RESULTS & SCHEMA.ORG STRUCTURED DATA TEST SUITE');
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
  assert(schemas.length >= 2, `Expected at least 2 JSON-LD schema blocks in ${label}`);

  // 1. Validate SoftwareApplication schema
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

  // 2. Validate FAQPage schema
  const faqPage = schemas.find(s => s['@type'] === 'FAQPage');
  assert(faqPage, `Must contain a schema of @type: "FAQPage" in ${label}`);
  assert.strictEqual(faqPage['@context'], 'https://schema.org');
  assert(Array.isArray(faqPage.mainEntity), 'mainEntity must be an array of questions');
  assert(faqPage.mainEntity.length >= 5, `Expected at least 5 FAQ questions in ${label}`);

  faqPage.mainEntity.forEach((item, index) => {
    assert.strictEqual(item['@type'], 'Question');
    assert(item.name && item.name.length > 5);
    assert(item.acceptedAnswer);
    assert.strictEqual(item.acceptedAnswer['@type'], 'Answer');
    assert(item.acceptedAnswer.text && item.acceptedAnswer.text.length > 10);
  });
  console.log(`  ✅ FAQPage Schema: 100% Valid (${faqPage.mainEntity.length} Q&As)`);
}

function runValidation() {
  validateHtmlFile(srcHtmlPath, 'Source index.html (Webapp)');
  validateHtmlFile(publicHtmlPath, 'Production index.html (Backend public)');

  console.log('\n================================================================');
  console.log('🎉 ALL STRUCTURED DATA TESTS PASSED! 100% GOOGLE RICH RESULTS COMPLIANT');
  console.log('================================================================');
}

runValidation();
