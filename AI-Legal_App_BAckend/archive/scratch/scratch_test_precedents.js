import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Project from './models/Project.js';
import { findPrecedents, analyzePrecedent } from './Tools/AI_Legal/services/precedents.service.js';

// Configure DNS servers to resolve MongoDB SRV records on Windows
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
console.log('Connecting to MongoDB at:', uri);

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 10000,
  family: 4
})
.then(async () => {
  console.log('✅ Connected to MongoDB successfully!');

  // 1. Setup mock/active case context
  let caseContext = await Project.findOne({ name: /Rahul Sharma/i });
  if (!caseContext) {
    console.log('No Rahul Sharma case found in DB. Constructing a mock case context...');
    caseContext = {
      name: "Rahul Sharma vs ABC Builders Pvt. Ltd.",
      caseType: "Property Dispute",
      legalIssues: ["Cheating", "Delay in possession", "Breach of contract"],
      summary: "The client purchased a residential apartment from ABC Builders Pvt. Ltd. in 2022. Despite full payment, the builder has delayed possession and failed to register the property under RERA rules.",
      reliefGoals: "Possession of the apartment, delay compensation, and RERA registration.",
      facts: [
        { date: new Date('2022-01-10'), event: "Booking", description: "Paid booking amount of 10 Lakhs." },
        { date: new Date('2022-06-15'), event: "Agreement", description: "Signed builder-buyer agreement for possession by Dec 2024." }
      ]
    };
  } else {
    console.log('Found existing case context for:', caseContext.name);
  }

  // 2. Run findPrecedents
  console.log('\n--- Starting Precedent Discovery ---');
  console.time('precedent_discovery');
  const results = await findPrecedents(null, caseContext, 'English');
  console.timeEnd('precedent_discovery');

  console.log('\n--- Discovery Output ---');
  console.log('Mode:', results.mode);
  console.log('Optimized Query Banner:', results.query);
  console.log('Extracted Metadata:', JSON.stringify(results.metadata, null, 2));
  console.log(`Found ${results.precedents.length} precedents.`);

  if (results.precedents.length > 0) {
    const topPrecedent = results.precedents[0];
    console.log('\n--- Top Precedent Result Card ---');
    console.log('Name:', topPrecedent.case_identity?.case_name || topPrecedent.case_name);
    console.log('Court:', topPrecedent.case_identity?.court || topPrecedent.court);
    console.log('Year:', topPrecedent.case_identity?.year || topPrecedent.year);
    console.log('Citation:', topPrecedent.case_identity?.citation || topPrecedent.citation);
    console.log('Relevance Score:', topPrecedent.relevance_score || topPrecedent.similarity?.relevance_score, '%');
    console.log('One-line Summary:', topPrecedent.one_line_summary);
    console.log('Legal Principle:', topPrecedent.legal_principle);
    console.log('Applicable Sections:', topPrecedent.applicable_sections);

    // 3. Test analyzePrecedent for Intelligence Report
    console.log('\n--- Generating AI Intelligence Report for Top Precedent ---');
    console.time('intelligence_report');
    const intelReport = await analyzePrecedent('intelligence_report', topPrecedent, caseContext, 'English');
    console.timeEnd('intelligence_report');
    console.log(intelReport.substring(0, 1000) + '...\n(Report truncated for space)');

    // 4. Test analyzePrecedent for AI Comparison
    console.log('\n--- Generating AI Comparison Report for Top Precedent ---');
    console.time('ai_comparison');
    const compReport = await analyzePrecedent('compare', topPrecedent, caseContext, 'English');
    console.timeEnd('ai_comparison');
    console.log(compReport.substring(0, 1000) + '...\n(Comparison truncated for space)');
  } else {
    console.log('❌ No precedents returned!');
  }

  process.exit(0);
})
.catch((err) => {
  console.error('❌ Script execution failed:', err);
  process.exit(1);
});
