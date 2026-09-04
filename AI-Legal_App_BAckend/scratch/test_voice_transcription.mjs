import fs from 'fs';
import path from 'path';

function runVoiceTranscriptionTests() {
  console.log('====================================================');
  console.log('STARTING NATIVE MULTILINGUAL VOICE TRANSCRIPTION TESTS');
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
  // TEST MATRIX 1: BACKEND TRANSCRIBE SERVICE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 1: BACKEND TRANSCRIBE SERVICE VERIFICATION ---');

  const voiceControllerPath = path.join(process.cwd(), 'controllers', 'voiceController.js');
  const controllerCode = fs.readFileSync(voiceControllerPath, 'utf8');

  assert(controllerCode.includes('transcriptions.create'), 'Voice controller uses Speech-to-Text transcriptions API (not translation)');
  assert(controllerCode.includes('Preserve exact spoken words without translation or rewriting'), 'Voice controller contains strict prompt preserving original spoken words');
  assert(!controllerCode.includes('translations.create'), 'Voice controller does NOT call translations.create');

  console.log('');

  // -------------------------------------------------------------------------
  // TEST MATRIX 2: FRONTEND LANGUAGE RESOLUTION MAPPING
  // -------------------------------------------------------------------------
  console.log('--- TEST MATRIX 2: FRONTEND LANGUAGE RESOLUTION MAPPING ---');

  const speechHookPath = path.join(process.cwd(), '..', 'AI-Legal_App_frontend-mobile', 'src', 'hooks', 'use-speech-recognition.ts');
  const speechHookCode = fs.readFileSync(speechHookPath, 'utf8');

  const languagesToVerify = [
    { key: 'hi-IN', name: 'Hindi' },
    { key: 'mr-IN', name: 'Marathi' },
    { key: 'ta-IN', name: 'Tamil' },
    { key: 'te-IN', name: 'Telugu' },
    { key: 'gu-IN', name: 'Gujarati' },
    { key: 'kn-IN', name: 'Kannada' },
    { key: 'ml-IN', name: 'Malayalam' },
    { key: 'bn-IN', name: 'Bengali' },
    { key: 'pa-IN', name: 'Punjabi' },
    { key: 'sa-IN', name: 'Sanskrit' },
    { key: 'ur-IN', name: 'Urdu' }
  ];

  for (const lang of languagesToVerify) {
    assert(speechHookCode.includes(lang.key), `Speech recognition hook supports BCP-47 code for ${lang.name} (${lang.key})`);
  }

  assert(speechHookCode.includes("l === 'auto'"), 'Auto language detection handled without forcing English default');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('✅ ALL NATIVE MULTILINGUAL VOICE TRANSCRIPTION TESTS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  }
}

runVoiceTranscriptionTests();
