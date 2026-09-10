import axios from 'axios';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

async function testPdfParse() {
  try {
    const pdfUrl = 'https://giwmscdnone.gov.np/media/pdf_upload/%E0%A4%B5%E0%A4%BF%E0%A4%A7%E0%A4%BE%E0%A4%AF%E0%A4%A8%20%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%80%20%E0%A4%B5%E0%A4%BF%E0%A4%A7%E0%A5%87%E0%A4%AF%E0%A4%95%2C%20%E0%A5%A8%E0%A5%A6%E0%A5%AE%E0%A5%A7%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A4%BE%E0%A4%A3%E0%A5%80%E0%A4%95%E0%A4%B0%E0%A4%A3%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%A4%E0%A4%BF%202081-12-4_qgvn9q6.pdf';
    console.log('Downloading sample Nepal PDF...');
    const res = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    console.log('PDF downloaded, byte size:', res.data.length);
    const data = await pdfParse(res.data);
    console.log('Total pages:', data.numpages);
    console.log('Extracted text sample (first 1000 chars):');
    console.log(data.text.replace(/\s+/g, ' ').slice(0, 1000));
  } catch (e) {
    console.error('PDF Parse error:', e.message);
  }
}

testPdfParse();
