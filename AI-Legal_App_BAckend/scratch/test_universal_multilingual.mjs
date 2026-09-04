import dotenv from 'dotenv';
import { resolveResponseLanguage } from '../utils/languageResolver.js';

dotenv.config();

function runUniversalMultilingualTests() {
  console.log('====================================================');
  console.log('STARTING MASTER UNIVERSAL MULTILINGUAL RESPONSE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST MATRIX 1: PRIORITY 1 - EXPLICIT IN-MESSAGE LANGUAGE REQUESTS
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 1: PRIORITY 1 EXPLICIT IN-MESSAGE REQUESTS ---');

  const testP1Cases = [
    { input: "Marathi me smjhao", expectedLang: "Marathi" },
    { input: "Explain in Marathi", expectedLang: "Marathi" },
    { input: "उत्तर संस्कृत में दो", expectedLang: "Sanskrit" },
    { input: "Explain in Sanskrit", expectedLang: "Sanskrit" },
    { input: "ಕನ್ನಡದಲ್ಲಿ ಹೇಳಿ", expectedLang: "Kannada" },
    { input: "Explain in Tamil", expectedLang: "Tamil" },
    { input: "Speak in Gujarati", expectedLang: "Gujarati" },
    { input: "Translate into Bengali", expectedLang: "Bengali" },
    { input: "Explain Section 420 in Punjabi vich", expectedLang: "Punjabi" },
    { input: "Tell me in Telugu lo", expectedLang: "Telugu" },
    { input: "Malayalam il samjhao", expectedLang: "Malayalam" },
    { input: "Urdu me jawab do", expectedLang: "Urdu" },
    { input: "Odia re batao", expectedLang: "Odia" }
  ];

  for (const tc of testP1Cases) {
    const res = resolveResponseLanguage({ currentMessage: tc.input });
    assert(
      res.language === tc.expectedLang && res.source === 'explicit_message_request',
      `"${tc.input}" -> Resolved to ${res.language} (Source: ${res.source})`
    );
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 2: PRIORITY 2 - SELECTED OUTPUT LANGUAGE SETTING
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 2: PRIORITY 2 SELECTED OUTPUT LANGUAGE SETTINGS ---');

  const p2_1 = resolveResponseLanguage({ currentMessage: "What is IPC Section 302?", selectedLanguage: "Kannada" });
  assert(p2_1.language === "Kannada" && p2_1.source === "app_setting_language", `Output Language = Kannada overrides general query -> ${p2_1.language}`);

  const p2_2 = resolveResponseLanguage({ currentMessage: "What is bail procedure?", selectedLanguage: "Marathi" });
  assert(p2_2.language === "Marathi" && p2_2.source === "app_setting_language", `Output Language = Marathi overrides general query -> ${p2_2.language}`);

  const p2_3 = resolveResponseLanguage({ currentMessage: "Explain in Sanskrit", selectedLanguage: "Marathi" });
  assert(p2_3.language === "Sanskrit" && p2_3.source === "explicit_message_request", `Explicit in-message "Explain in Sanskrit" takes Priority 1 over UI setting Marathi -> ${p2_3.language}`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 3: PRIORITY 3 - AUTO-DETECTED QUERY LANGUAGE
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 3: PRIORITY 3 AUTO-DETECTED QUERY LANGUAGE ---');

  const p3_1 = resolveResponseLanguage({ currentMessage: "धारा 420 क्या है?" });
  assert(p3_1.language === "Hindi" && p3_1.script === "Devanagari", `Hindi Devanagari query -> ${p3_1.language}`);

  const p3_2 = resolveResponseLanguage({ currentMessage: "What are the essential elements of a contract?" });
  assert(p3_2.language === "English" && p3_2.script === "Latin", `English query -> ${p3_2.language}`);

  const p3_3 = resolveResponseLanguage({ currentMessage: "मला या एफआयआरची माहिती सांगा." });
  assert(p3_3.language === "Marathi" && p3_3.script === "Devanagari", `Marathi Devanagari query -> ${p3_3.language}`);

  const p3_4 = resolveResponseLanguage({ currentMessage: "संसारः परिवर्तनशीलः अस्ति।" });
  assert(p3_4.language === "Sanskrit" && p3_4.script === "Devanagari", `Sanskrit Devanagari query -> ${p3_4.language}`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 4: PROHIBITION ON REFUSAL MESSAGES IN INSTRUCTIONS
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 4: PROHIBITION ON REFUSAL MESSAGES IN INSTRUCTIONS ---');

  const marathiInstr = resolveResponseLanguage({ currentMessage: "Marathi me smjhao" }).systemInstruction;
  assert(marathiInstr.includes('ABSOLUTE PROHIBITION ON REFUSAL MESSAGES'), `Refusal prohibition rule present in system instruction`);
  assert(!marathiInstr.includes('I can only assist in English'), `No English-only restriction in instruction`);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL UNIVERSAL MULTILINGUAL TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
}

runUniversalMultilingualTests();
