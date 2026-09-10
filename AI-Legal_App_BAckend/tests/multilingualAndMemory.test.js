import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

import { resolveResponseLanguage, buildSystemLanguageInstruction } from '../utils/languageResolver.js';
import { GLOBAL_RULES } from '../Tools/AI_Legal/legalPrompts.js';

console.log('====================================================');
console.log('🧪 RUNNING MULTILINGUAL & MEMORY VERIFICATION SUITE');
console.log('====================================================');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [TEST ${total}] PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [TEST ${total}] FAILED: ${name}`);
      console.error(err);
    }
  }

  // TEST 1: Pure English Input Auto-Mirroring
  test('Pure English input auto-mirrors to English', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'What is the punishment for cheque bounce under Section 138 of the NI Act?',
      selectedLanguage: ''
    });
    assert.strictEqual(res.language, 'English');
    assert.strictEqual(res.script, 'Latin');
    assert.strictEqual(res.style, 'Standard');
  });

  // TEST 2: Pure Hindi (Devanagari) Input Auto-Mirroring
  test('Pure Hindi (Devanagari) input auto-mirrors to Hindi (Devanagari)', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'क्या चेक बाउंस होने पर तुरंत जमानत मिल सकती है?',
      selectedLanguage: ''
    });
    assert.strictEqual(res.language, 'Hindi');
    assert.strictEqual(res.script, 'Devanagari');
    assert.strictEqual(res.style, 'Standard');
  });

  // TEST 3: Hinglish (Roman Hindi) Input Auto-Mirroring
  test('Hinglish input auto-mirrors to Hinglish (Roman Hindi)', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'cheque bounce hone par kya bail mil sakti hai aur iska kya process hota hai?',
      selectedLanguage: ''
    });
    assert.strictEqual(res.language, 'Hindi');
    assert.strictEqual(res.style, 'Hinglish');
    assert.strictEqual(res.script, 'Latin');
  });

  // TEST 4: UI Priority Inversion: UI is 'Hindi', but user types English -> Output MUST be English
  test('UI selectedLanguage=Hindi does NOT hijack user English input', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'Can I file an appeal in the High Court against this order?',
      selectedLanguage: 'Hindi'
    });
    assert.strictEqual(res.language, 'English', 'Should mirror English input despite UI=Hindi');
    assert.strictEqual(res.script, 'Latin');
  });

  // TEST 5: UI Priority Inversion: UI is 'English', but user types pure Hindi -> Output MUST be Hindi
  test('UI selectedLanguage=English does NOT hijack user Devanagari Hindi input', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'मुझे उच्च न्यायालय में अपील दायर करनी है।',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res.language, 'Hindi', 'Should mirror Hindi input despite UI=English');
    assert.strictEqual(res.script, 'Devanagari');
  });

  // TEST 6: UI Priority Inversion: UI is 'English', but user types Hinglish -> Output MUST be Hinglish
  test('UI selectedLanguage=English does NOT hijack user Hinglish input', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'mujhe high court me appeal file karni hai is case me',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res.language, 'Hindi');
    assert.strictEqual(res.style, 'Hinglish');
  });

  // TEST 7: Explicit Language Request: "explain me in sanskrit"
  test('Explicit command "explain me in sanskrit" triggers Sanskrit', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'explain me in sanskrit about bail under BNSS',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res.language, 'Sanskrit');
    assert.strictEqual(res.script, 'Devanagari');
    assert.strictEqual(res.source, 'explicit_message_request');
  });

  // TEST 8: Explicit Language Request with typo: "explain me in sandruit"
  test('Typo tolerance: "explain me in sandruit" maps to Sanskrit', () => {
    const res = resolveResponseLanguage({
      currentMessage: 'explain me in sandruit',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res.language, 'Sanskrit');
    assert.strictEqual(res.script, 'Devanagari');
    assert.strictEqual(res.source, 'explicit_message_request');
  });

  // TEST 9: Explicit Marathi Request: "मराठीत सांगा" / "marathi me samjhao"
  test('Explicit Marathi command triggers Marathi', () => {
    const res1 = resolveResponseLanguage({
      currentMessage: 'मराठीत सांगा जामीन कशी मिळेल',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res1.language, 'Marathi');
    assert.strictEqual(res1.script, 'Devanagari');

    const res2 = resolveResponseLanguage({
      currentMessage: 'marathi me samjhao is case ke bare me',
      selectedLanguage: 'English'
    });
    assert.strictEqual(res2.language, 'Marathi');
    assert.strictEqual(res2.script, 'Devanagari');
  });

  // TEST 10: Neutral input fallback to selectedLanguage
  test('Neutral short code ("106") falls back to selectedLanguage', () => {
    const resHindi = resolveResponseLanguage({
      currentMessage: '106',
      selectedLanguage: 'Hindi'
    });
    assert.strictEqual(resHindi.language, 'Hindi');

    const resEnglish = resolveResponseLanguage({
      currentMessage: '106',
      selectedLanguage: 'English'
    });
    assert.strictEqual(resEnglish.language, 'English');
  });

  // TEST 11: Persistent Conversation Memory Rules in legalPrompts.js
  test('legalPrompts.js contains PERSISTENT MULTI-TURN CONVERSATION MEMORY RETENTION', () => {
    assert(GLOBAL_RULES.includes('PERSISTENT MULTI-TURN CONVERSATION MEMORY RETENTION'), 'Includes multi-turn memory mandate');
    assert(!GLOBAL_RULES.includes('Ignore all older conversation beyond the last completed task'), 'Removed legacy forgetting rule');
    assert(!GLOBAL_RULES.includes('If UI is Hindi and user input is English, the output MUST be in pure Hindi'), 'Removed legacy UI hijacking rule');
  });

  // TEST 12: System instruction generation for Hinglish and Sanskrit
  test('buildSystemLanguageInstruction outputs correct directives', () => {
    const hinglishInstr = buildSystemLanguageInstruction({ language: 'Hindi', style: 'Hinglish', script: 'Latin', source: 'detected_hinglish' });
    assert(hinglishInstr.includes('NATURAL CONVERSATIONAL HINGLISH') || hinglishInstr.includes('natural conversational HINGLISH'));

    const sanskritInstr = buildSystemLanguageInstruction({ language: 'Sanskrit', style: 'Standard', script: 'Devanagari', source: 'explicit_message_request' });
    assert(sanskritInstr.includes('SANSKRIT'));
  });

  console.log('====================================================');
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
