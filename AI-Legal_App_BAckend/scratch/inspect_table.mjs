import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectTable() {
  const url = 'http://www.lawcommission.gov.np/category/2163';
  const res = await axios.get(url, { timeout: 15000 });
  const $ = cheerio.load(res.data);

  $('table tr').each((i, row) => {
    const cols = $(row).find('th, td').map((j, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();
    const link = $(row).find('a').attr('href');
    console.log(`Row ${i}:`, cols, `| Link: ${link}`);
  });
}

inspectTable().catch(console.error);
