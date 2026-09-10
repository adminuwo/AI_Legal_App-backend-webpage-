import dotenv from 'dotenv';
import { executeTargetedLegalSearch } from '../services/legalSearchOrchestrator.js';

dotenv.config();

async function testNepalSearch() {
  const queries = [
    'Constitution of Nepal site:lawcommission.gov.np',
    'National Penal Code 2074 Muluki Criminal Code Nepal site:lawcommission.gov.np',
    'Companies Act 2063 Nepal site:lawcommission.gov.np'
  ];

  for (const q of queries) {
    console.log(`\n=== Searching: ${q} ===`);
    const res = await executeTargetedLegalSearch(q, {
      jurisdiction: { country: 'Nepal', state: '' },
      maxResults: 3
    });
    console.log('Summary:', res.summary?.slice(0, 200));
    console.log('Sources:', res.sources.map(s => ({ title: s.title, url: s.url, tier: s.tier })));
  }
}

testNepalSearch().catch(console.error);
