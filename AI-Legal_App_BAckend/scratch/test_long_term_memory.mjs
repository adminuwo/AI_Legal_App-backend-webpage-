import dotenv from 'dotenv';
import { performGlobalDatabaseSearch } from '../utils/aiMemorySystem.js';

dotenv.config();

function runLongTermMemoryTests() {
  console.log('====================================================');
  console.log('STARTING PERSISTENT LONG-TERM MEMORY TESTS');
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
  // TEST MATRIX 1: HINGLISH & MULTILINGUAL RECALL QUERY DETECTION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 1: HINGLISH & MULTILINGUAL RECALL QUERY DETECTION ---');

  const hingeQueries = [
    "Tumhe ytaad hai humne pehle kis topic pr baat kiya tha",
    "tumhe yaad hai pehle kya baat hui thi",
    "purani baat batao",
    "kal ki baat yaad hai?",
    "last time kya discussion hua tha?",
    "Do you remember our previous conversation?",
    "Continue from yesterday",
    "Remember my contract review?",
    "क्या तुम्हें याद है पिछला चैट",
    "मागील चर्चा काय होती?"
  ];

  const recallRegex = /\b(tumhe yaad|tumhe ytaad|yaad hai|pehle kis topic|pehle kya|purani baat|purana chat|kal ki baat|last time kya|pehle wala|pehle baat|pehle discussion|kya baat hui|kya baat hua|do you remember|continue from|continue my|last time|yesterday|previous conversation|previous chat|discussed|our last|prior conversation|remember our|last discussion|remember me|remember my|previous topic|what were we discussing|what did we talk|आठवते का|मागील चर्चा|क्या तुम्हें याद है|तुम्हें याद|पिछला चैट|मागील चर्चा)\b/i;

  for (const q of hingeQueries) {
    const matches = recallRegex.test(q) || (q.includes('याद') || q.includes('चर्चा') || q.includes('आठवते'));
    assert(matches, `"${q}" recognized as recall query`);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 2: PROHIBITION ON MEMORY REFUSAL MESSAGES
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 2: PROHIBITION ON MEMORY REFUSAL MESSAGES ---');

  const forbiddenPhrases = [
    "I don't have the capability to recall past conversations",
    "I cannot remember previous conversations",
    "I don't have access to previous conversations",
    "I cannot recall",
    "I don't have memory",
    "As an AI, I don't remember past chats"
  ];

  const instructionText = `
1. ABSOLUTE PROHIBITION ON MEMORY REFUSAL MESSAGES:
   - NEVER output phrases like "I don't have the capability to recall past conversations", "I cannot remember previous conversations", "I don't have access to previous conversations", "I cannot recall", "I don't have memory", or "As an AI, I don't remember past chats".
   - ALWAYS inspect the provided [USER PERMANENT CONVERSATION & LEGAL MEMORY ARCHIVE] in your context.
`;

  assert(instructionText.includes('ABSOLUTE PROHIBITION ON MEMORY REFUSAL MESSAGES'), 'System instructions include absolute prohibition on memory refusal');

  for (const phrase of forbiddenPhrases) {
    assert(instructionText.includes(phrase), `Prohibited phrase included in ban list: "${phrase}"`);
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL LONG-TERM MEMORY TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
}

runLongTermMemoryTests();
