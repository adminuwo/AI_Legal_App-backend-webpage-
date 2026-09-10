import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkEnglish() {
  const urls = [
    'https://repository.lawcommission.gov.np/',
    'https://repository.lawcommission.gov.np/en/',
    'http://www.lawcommission.gov.np/pages/list-volume-act',
    'http://www.lawcommission.gov.np/category/1807'
  ];

  for (const url of urls) {
    try {
      console.log(`\n=== Checking: ${url} ===`);
      const res = await axios.get(url, { 
        timeout: 10000, 
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
      const $ = cheerio.load(res.data);
      console.log('Status:', res.status, '| Title:', $('title').text().replace(/\s+/g, ' ').trim());
      const links = $('a').map((i, el) => $(el).attr('href')).get();
      const engLinks = links.filter(l => l && (l.includes('/en') || l.includes('english') || l.includes('act')));
      console.log('English / Act link count:', engLinks.length, 'Sample:', engLinks.slice(0, 5));
    } catch (e) {
      console.log('Failed:', url, e.message);
    }
  }
}

checkEnglish().catch(console.error);
