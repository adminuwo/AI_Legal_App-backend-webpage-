import fs from 'fs';
import { LANDMARK_JUDGMENTS_DATABASE } from '../constants/landmarkJudgmentsData.js';
import { generateJudgmentLawReportPdf } from '../services/courtOrderPdfService.js';

async function test() {
  const caseData = LANDMARK_JUDGMENTS_DATABASE.find(x => x.id === 'navtej-singh-johar');
  console.log('Generating PDF for:', caseData.title);
  const pdfBytes = await generateJudgmentLawReportPdf(caseData);
  fs.writeFileSync('scratch/test_navtej.pdf', Buffer.from(pdfBytes));
  console.log('Wrote scratch/test_navtej.pdf, size:', pdfBytes.length, 'bytes');
}

test().catch(console.error);
