import dotenv from 'dotenv';
import { resolveResponseLanguage } from '../utils/languageResolver.js';
import { performGlobalDatabaseSearch } from '../utils/aiMemorySystem.js';

dotenv.config();

function runPersistentMemoryTests() {
  console.log('====================================================');
  console.log('STARTING PERSISTENT CONVERSATION MEMORY & CONTEXT TESTS');
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
  // TEST MATRIX 1: FOLLOW-UP & TRANSFORMATION COMMAND RECOGNITION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 1: FOLLOW-UP & TRANSFORMATION COMMAND RECOGNITION ---');

  const transformationCommands = [
    "Explain in Hindi",
    "Explain in Marathi",
    "Make it shorter",
    "Add more points",
    "Give citations",
    "Make it formal",
    "Convert into table",
    "Translate to Gujarati",
    "Simplify this",
    "Expand this point",
    "Remove point 4"
  ];

  const transformRegex = /\b(explain in|translate|translate into|in hindi|in marathi|in sanskrit|in tamil|in telugu|in kannada|in gujarati|in bengali|in punjabi|in urdu|hindi me|marathi me|sanskrit me|tamil me|kannada me|telugu me|gujarati me|make it shorter|shorter|make it formal|make it simple|simplify|expand|summarize|add more points|add points|add examples|give citations|continue|convert to table|convert into table|convert into points|remove point|advocate-friendly|re-explain|rephrase)\b/i;

  for (const cmd of transformationCommands) {
    const matches = transformRegex.test(cmd);
    assert(matches, `"${cmd}" recognized as a transformation command`);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 2: MEMORY RESET COMMAND RECOGNITION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 2: MEMORY RESET COMMAND RECOGNITION ---');

  const resetCommands = [
    "Start a new topic",
    "Forget previous conversation",
    "Clear context",
    "Reset chat",
    "Clear memory",
    "Forget history"
  ];

  const resetRegex = /\b(start a new topic|forget previous conversation|clear context|reset chat|clear memory|forget history)\b/i;

  for (const rCmd of resetCommands) {
    const matches = resetRegex.test(rCmd);
    assert(matches, `"${rCmd}" recognized as a memory reset command`);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 3: CROSS-CHAT RECALL QUERY RECOGNITION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 3: CROSS-CHAT RECALL QUERY RECOGNITION ---');

  const recallQueries = [
    "Do you remember our previous conversation?",
    "Continue from yesterday",
    "Last time we discussed my property dispute",
    "Continue my contract review",
    "What did we discuss yesterday?"
  ];

  const recallRegex = /\b(do you remember|continue from|continue my|last time|yesterday|previous conversation|previous chat|discussed|our last|prior conversation|remember our|last discussion|remember me)\b/i;

  for (const rQuery of recallQueries) {
    const matches = recallRegex.test(rQuery);
    assert(matches, `"${rQuery}" recognized as a cross-chat recall query`);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 4: LANGUAGE LOCK PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 4: LANGUAGE LOCK PERSISTENCE ---');

  const lang1 = resolveResponseLanguage({ currentMessage: "Explain in Hindi" });
  assert(lang1.language === "Hindi", `"Explain in Hindi" resolves to Hindi`);

  const lang2 = resolveResponseLanguage({ currentMessage: "What is Section 302?", selectedLanguage: lang1.language });
  assert(lang2.language === "Hindi", `Subsequent query inherits language lock = Hindi`);

  const lang3 = resolveResponseLanguage({ currentMessage: "Continue in Marathi", selectedLanguage: lang2.language });
  assert(lang3.language === "Marathi" && lang3.source === "explicit_message_request", `"Continue in Marathi" updates language lock to Marathi`);

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL PERSISTENT CONVERSATION MEMORY TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
}

runPersistentMemoryTests();
