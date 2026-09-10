import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import * as aiService from '../services/ai.service.js';
import { resolveResponseLanguage } from '../utils/languageResolver.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('================================================================');
console.log('🧠 MULTI-TURN CONVERSATION MEMORY & LANGUAGE SWITCH E2E TEST');
console.log('================================================================');

async function runE2ETest() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_ATLAS_URI;
  if (mongoUri && mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✅ Connected to MongoDB for memory persistence test');
    } catch (dbErr) {
      console.warn('⚠️ MongoDB connection skipped:', dbErr.message);
    }
  }

  const conversationHistory = [];
  const sessionId = `test_sess_${Date.now()}`;

  // TURN 1: English with client facts
  console.log('\n--- TURN 1: English Input (Fact Injection) ---');
  const turn1Input = "My client Rajesh Sharma was issued a cheque bounce notice of 5 Lakh rupees under Section 138 NI Act by ABC Enterprises on 15th January.";
  const lang1 = resolveResponseLanguage({ currentMessage: turn1Input });
  console.log(`Input: "${turn1Input}"`);
  console.log(`Detected Language: ${lang1.language}, Style: ${lang1.style}, Script: ${lang1.script}`);
  assert.strictEqual(lang1.language, 'English', 'Turn 1 must resolve to English');

  const res1 = await aiService.chat(turn1Input, null, {
    conversationId: sessionId,
    history: conversationHistory,
    mode: 'LEGAL_TOOLKIT'
  });
  console.log(`Response snippet: "${res1.text.substring(0, 200)}..."`);
  assert(res1.text && res1.text.length > 50, 'Turn 1 must produce a valid response');
  
  // Append to history
  conversationHistory.push({ role: 'user', content: turn1Input });
  conversationHistory.push({ role: 'assistant', content: res1.text });

  await sleep(2000);

  // TURN 2: Pure Hindi (Devanagari) follow-up referencing client
  console.log('\n--- TURN 2: Pure Hindi Input (Memory & Devanagari Switch) ---');
  const turn2Input = "राजेश शर्मा को इस मामले में क्या कानूनी कदम उठाने चाहिए?";
  const lang2 = resolveResponseLanguage({ currentMessage: turn2Input });
  console.log(`Input: "${turn2Input}"`);
  console.log(`Detected Language: ${lang2.language}, Style: ${lang2.style}, Script: ${lang2.script}`);
  assert.strictEqual(lang2.language, 'Hindi', 'Turn 2 must resolve to Hindi');
  assert.strictEqual(lang2.script, 'Devanagari', 'Turn 2 must be Devanagari script');

  const res2 = await aiService.chat(turn2Input, null, {
    conversationId: sessionId,
    history: conversationHistory,
    mode: 'LEGAL_TOOLKIT'
  });
  console.log(`Response snippet: "${res2.text.substring(0, 200)}..."`);
  assert(res2.text.includes('राजेश') || res2.text.includes('नोटिस') || res2.text.includes('चेक') || res2.text.includes('धारा 138') || res2.text.includes('138'), 'Turn 2 must retain Turn 1 context in Hindi');

  conversationHistory.push({ role: 'user', content: turn2Input });
  conversationHistory.push({ role: 'assistant', content: res2.text });

  await sleep(2000);

  // TURN 3: Hinglish follow-up
  console.log('\n--- TURN 3: Hinglish Input (Hinglish Style Switch) ---');
  const turn3Input = "isme settlement ya mediation ka option hota hai kya?";
  const lang3 = resolveResponseLanguage({ currentMessage: turn3Input });
  console.log(`Input: "${turn3Input}"`);
  console.log(`Detected Language: ${lang3.language}, Style: ${lang3.style}, Script: ${lang3.script}`);
  assert.strictEqual(lang3.style, 'Hinglish', 'Turn 3 must resolve to Hinglish');

  const res3 = await aiService.chat(turn3Input, null, {
    conversationId: sessionId,
    history: conversationHistory,
    mode: 'LEGAL_TOOLKIT'
  });
  console.log(`Response snippet: "${res3.text.substring(0, 200)}..."`);
  assert(res3.text.length > 50, 'Turn 3 must produce valid Hinglish response');

  conversationHistory.push({ role: 'user', content: turn3Input });
  conversationHistory.push({ role: 'assistant', content: res3.text });

  await sleep(2000);

  // TURN 4: Explicit Language Switch to Sanskrit
  console.log('\n--- TURN 4: Explicit Sanskrit Switch ("explain me in sandruit") ---');
  const turn4Input = "explain me in sandruit";
  const lang4 = resolveResponseLanguage({ currentMessage: turn4Input });
  console.log(`Input: "${turn4Input}"`);
  console.log(`Detected Language: ${lang4.language}, Style: ${lang4.style}, Script: ${lang4.script}`);
  assert.strictEqual(lang4.language, 'Sanskrit', 'Turn 4 must resolve to Sanskrit via typo tolerance');

  const res4 = await aiService.chat(turn4Input, null, {
    conversationId: sessionId,
    history: conversationHistory,
    mode: 'LEGAL_TOOLKIT'
  });
  console.log(`Response snippet: "${res4.text.substring(0, 200)}..."`);
  assert(res4.text.length > 30, 'Turn 4 must produce valid Sanskrit response');

  conversationHistory.push({ role: 'user', content: turn4Input });
  conversationHistory.push({ role: 'assistant', content: res4.text });

  await sleep(3000);

  // TURN 5: Recall Opponent from Turn 1 in English
  console.log('\n--- TURN 5: Fact Recall Check (Who is the opponent?) ---');
  const turn5Input = "Who is the opposing party/company that sent the notice?";
  const lang5 = resolveResponseLanguage({ currentMessage: turn5Input });
  assert.strictEqual(lang5.language, 'English', 'Turn 5 must resolve to English');

  const res5 = await aiService.chat(turn5Input, null, {
    conversationId: sessionId,
    history: conversationHistory,
    mode: 'LEGAL_TOOLKIT'
  });
  console.log(`Response snippet: "${res5.text}"`);
  assert(res5.text.toLowerCase().includes('abc enterprises'), 'Turn 5 MUST recall "ABC Enterprises" from Turn 1');

  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-TURN MEMORY & LANGUAGE SWITCH TESTS PASSED!');
  console.log('================================================================');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

runE2ETest().catch(err => {
  console.error('❌ E2E Test Error:', err);
  if (mongoose.connection.readyState !== 0) {
    mongoose.disconnect();
  }
  process.exit(1);
});
