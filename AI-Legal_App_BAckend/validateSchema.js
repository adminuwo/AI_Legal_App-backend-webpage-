import fs from 'fs';

const files = [
  '../AI-Legal_App_Webapp/index.html',
  './public/index.html'
];

files.forEach(file => {
  console.log(`\n========================================`);
  console.log(`Validating Schema: ${file}`);
  console.log(`========================================`);
  const html = fs.readFileSync(file, 'utf8');
  const scriptRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;

  while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    try {
      const json = JSON.parse(match[1]);
      console.log(`✅ Schema #${count} [@type: ${json['@type']}]: VALID JSON-LD`);
      
      if (json['@type'] === 'SoftwareApplication') {
        console.log(`   - Name: ${json.name}`);
        console.log(`   - Category: ${json.applicationCategory} / ${json.applicationSubCategory}`);
        console.log(`   - Operating System: ${json.operatingSystem}`);
        console.log(`   - Download URL: ${json.downloadUrl}`);
        console.log(`   - Install URL: ${json.installUrl}`);
        console.log(`   - Pricing/Offers: ${json.offers ? 'Valid Offers configured (' + (json.offers.offers?.length || 'single') + ' plans)' : 'MISSING'}`);
        console.log(`   - Aggregate Rating: ${json.aggregateRating ? json.aggregateRating.ratingValue + '/5 (' + json.aggregateRating.ratingCount + ' ratings)' : 'MISSING'}`);
      }
      
      if (json['@type'] === 'FAQPage') {
        console.log(`   - Total FAQs Count: ${json.mainEntity?.length || 0}`);
        json.mainEntity?.forEach((item, idx) => {
          console.log(`     Q${idx + 1}: "${item.name}"`);
          console.log(`        A: ${item.acceptedAnswer?.text?.substring(0, 75)}...`);
        });
      }
    } catch (err) {
      console.error(`❌ Schema #${count} Parsing Error:`, err.message);
    }
  }
});
