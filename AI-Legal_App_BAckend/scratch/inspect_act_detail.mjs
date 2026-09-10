import axios from 'axios';
import * as cheerio from 'cheerio';

async function testUrls() {
  const testUrls = [
    'http://www.lawcommission.gov.np/content/13588/economic-ann--2083/',
    'http://www.lawcommission.gov.np/content/13544/customs-act--2082/',
    'http://www.lawcommission.gov.np/category/2163'
  ];

  for (const url of testUrls) {
    try {
      console.log(`\n=== Testing: ${url} ===`);
      const res = await axios.get(url, { timeout: 15000 });
      const $ = cheerio.load(res.data);
      console.log('Title:', $('h1').text().trim());
      console.log('Date/time:', $('.meta.date, .post__meta, time').text().replace(/\s+/g, ' ').trim());
      
      // Look for iframe, embed, object, or pdf links
      const iframes = $('iframe').map((i, el) => $(el).attr('src')).get();
      console.log('Iframes:', iframes);

      const pdfs = $('a[href$=".pdf"]').map((i, el) => $(el).attr('href')).get();
      console.log('PDF links:', pdfs);

      // Look for table or section structure
      const tableRows = $('table tr').length;
      console.log('Table rows:', tableRows);

      // Check text in body
      const pTexts = $('p').map((i, el) => $(el).text().trim()).get().filter(t => t.length > 20);
      console.log('Sample paragraphs (>20 chars):', pTexts.slice(0, 5));
    } catch (e) {
      console.error('Failed:', e.message);
    }
  }
}

testUrls();
