import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScrape() {
  try {
    console.log('Fetching http://www.lawcommission.gov.np/category/1757 ...');
    const res = await axios.get('http://www.lawcommission.gov.np/category/1757', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(res.data);
    const acts = [];

    // Find all article/content links
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if ((href.includes('/content/') || href.includes('/act/') || text.includes('ऐन')) && text.length > 3) {
        acts.push({ href, text });
      }
    });

    console.log('Found acts count:', acts.length);
    console.log('Sample acts:');
    acts.slice(0, 15).forEach(a => console.log(`- ${a.text} -> ${a.href}`));

    if (acts.length > 0) {
      const sampleActUrl = acts[0].href.startsWith('http') ? acts[0].href : `http://www.lawcommission.gov.np${acts[0].href}`;
      console.log(`\nFetching detail of first act: ${sampleActUrl}`);
      const detailRes = await axios.get(sampleActUrl, { timeout: 15000 });
      const $d = cheerio.load(detailRes.data);
      const title = $d('h1, h2.title, .entry-title, .page-title').first().text().trim();
      const bodyText = $d('.entry-content, .content, #all-blocks, article').text().replace(/\s+/g, ' ').trim().slice(0, 500);
      console.log('Detail Title:', title);
      console.log('Detail Body Preview:', bodyText);
    }
  } catch (err) {
    console.error('Scrape test error:', err.message);
  }
}

testScrape();
