import dotenv from 'dotenv';
import { resolveResponseLanguage } from '../utils/languageResolver.js';
import WorkspaceAIContextService from '../services/WorkspaceAIContextService.js';

dotenv.config();

function runMultilingualTests() {
  console.log('====================================================');
  console.log('STARTING MASTER MULTILINGUAL & AUTO LANGUAGE TESTS');
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
  // TEST MATRIX 1: AUTOMATIC LANGUAGE & SCRIPT DETECTION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 1: AUTOMATIC LANGUAGE & SCRIPT DETECTION ---');

  // Test 1.1: English query
  const res1 = resolveResponseLanguage({ currentMessage: "What is Section 420 of IPC?" });
  assert(res1.language === 'English' && res1.style === 'Standard', `English input resolved correctly (Got ${res1.language}/${res1.style})`);

  // Test 1.2: Roman Hindi / Hinglish query
  const res2 = resolveResponseLanguage({ currentMessage: "Section 420 kya hai aur isme bail kaise milti hai?" });
  assert(res2.language === 'Hindi' && res2.style === 'Hinglish', `Hinglish input resolved correctly (Got ${res2.language}/${res2.style})`);

  // Test 1.3: Devanagari Hindi query
  const res3 = resolveResponseLanguage({ currentMessage: "धारा 420 क्या है और इसमें जमानत कैसे मिलती है?" });
  assert(res3.language === 'Hindi' && res3.script === 'Devanagari', `Hindi Devanagari resolved correctly (Got ${res3.language}/${res3.script})`);

  // Test 1.4: Devanagari Marathi query
  const res4 = resolveResponseLanguage({ currentMessage: "मला या केसची माहिती मराठीत समजावून सांगा." });
  assert(res4.language === 'Marathi' && res4.script === 'Devanagari', `Marathi Devanagari resolved correctly (Got ${res4.language}/${res4.script})`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 2: EXPLICIT IN-MESSAGE LANGUAGE OVERRIDES
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 2: EXPLICIT IN-MESSAGE LANGUAGE OVERRIDES ---');

  // Test 2.1: English question with explicit Hindi instruction
  const res2_1 = resolveResponseLanguage({ currentMessage: "Explain Section 420 IPC in Hindi me" });
  assert(res2_1.language === 'Hindi' && res2_1.source === 'explicit_message_request', `Explicit "in Hindi me" override applied (Got ${res2_1.language})`);

  // Test 2.2: Hindi question with explicit English request
  const res2_2 = resolveResponseLanguage({ currentMessage: "कल की सुनवाई की जानकारी in English" });
  assert(res2_2.language === 'English' && res2_2.source === 'explicit_message_request', `Explicit "in English" override applied (Got ${res2_2.language})`);

  // Test 2.3: Explicit Marathi request
  const res2_3 = resolveResponseLanguage({ currentMessage: "Explain this case Marathi madhe samjha" });
  assert(res2_3.language === 'Marathi' && res2_3.source === 'explicit_message_request', `Explicit "Marathi madhe" override applied (Got ${res2_3.language})`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 3: MID-CONVERSATION LANGUAGE SWITCHING
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 3: MID-CONVERSATION LANGUAGE SWITCHING ---');

  const turn1 = resolveResponseLanguage({ currentMessage: "Explain this judgment." });
  assert(turn1.language === 'English', `Turn 1: English judgment query -> English (Got ${turn1.language})`);

  const turn2 = resolveResponseLanguage({ currentMessage: "ab isko simple Hindi me samjhao" });
  assert(turn2.language === 'Hindi' && (turn2.style === 'Hinglish' || turn2.source === 'explicit_message_request'), `Turn 2: "ab isko simple Hindi me samjhao" -> Hindi/Hinglish (Got ${turn2.language}/${turn2.style})`);

  const turn3 = resolveResponseLanguage({ currentMessage: "Now give me key points in English" });
  assert(turn3.language === 'English', `Turn 3: "key points in English" -> English (Got ${turn3.language})`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 4: LEGAL TERM PRESERVATION IN SYSTEM INSTRUCTION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 4: LEGAL TERM PRESERVATION RULES ---');

  const instructionText = res2.systemInstruction;
  assert(instructionText.includes('CRITICAL LEGAL TERM PRESERVATION RULE'), `Legal term preservation rule present in system instruction`);
  assert(instructionText.includes('Section 420 IPC') || instructionText.includes('FIR, bail, hearing'), `Preservation list included in instruction`);

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 5: WORKSPACE ISOLATION INTEGRITY CHECK
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 5: WORKSPACE ISOLATION INTEGRITY CHECK ---');

  const tutorMeta = WorkspaceAIContextService.getAssistantMetadata('student');
  const advocateMeta = WorkspaceAIContextService.getAssistantMetadata('personal');
  const firmMeta = WorkspaceAIContextService.getAssistantMetadata('law_firm', 'Lex Corp LLP');

  assert(tutorMeta.assistantName === 'AI LEGAL TUTOR', `Student assistant is AI LEGAL TUTOR regardless of language`);
  assert(advocateMeta.assistantName === 'AI LEGAL ASSISTANT', `Advocate assistant is AI LEGAL ASSISTANT regardless of language`);
  assert(firmMeta.assistantName === 'AI FIRM ASSISTANT', `Firm assistant is AI FIRM ASSISTANT regardless of language`);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL MULTILINGUAL TESTS COMPLETED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
}

runMultilingualTests();
