import assert from 'assert';
import { resolveEffectiveTool } from '../routes/chatRoutes.js';

console.log('================================================================');
console.log('🧪 TEST: General Query Feature Limit Exemption Validation');
console.log('================================================================');

// 1. General Queries with draftMaker active
const test1 = resolveEffectiveTool('draftMaker', "What's your company name ?");
assert.strictEqual(test1, 'ai_chat', 'Expected general identity question in draftMaker to resolve to ai_chat');
console.log('  ✅ PASS: "What\'s your company name ?" in draftMaker resolves to ai_chat');

const test2 = resolveEffectiveTool('draftMaker', 'Who are you?');
assert.strictEqual(test2, 'ai_chat', 'Expected "Who are you?" in draftMaker to resolve to ai_chat');
console.log('  ✅ PASS: "Who are you?" in draftMaker resolves to ai_chat');

const test3 = resolveEffectiveTool('draftMaker', 'Hello, how does this app work?');
assert.strictEqual(test3, 'ai_chat', 'Expected greeting/help in draftMaker to resolve to ai_chat');
console.log('  ✅ PASS: Greeting in draftMaker resolves to ai_chat');

const test4 = resolveEffectiveTool('draftMaker', 'Explain section 302 of Indian Penal Code');
assert.strictEqual(test4, 'ai_chat', 'Expected legal Q&A in draftMaker to resolve to ai_chat');
console.log('  ✅ PASS: Section explanation in draftMaker resolves to ai_chat');

// 2. Real Drafting Requests with draftMaker
const test5 = resolveEffectiveTool('draftMaker', 'Draft a bail application for client in Rohini Court');
assert.strictEqual(test5, 'draftMaker', 'Expected actual drafting request to resolve to draftMaker');
console.log('  ✅ PASS: Real bail draft request resolves to draftMaker');

const test6 = resolveEffectiveTool('draftMaker', 'Rent agreement bana do 11 months ke liye');
assert.strictEqual(test6, 'draftMaker', 'Expected Hinglish rent agreement request to resolve to draftMaker');
console.log('  ✅ PASS: Hinglish rent agreement request resolves to draftMaker');

const test7 = resolveEffectiveTool('draftMaker', 'Please provide this in document format');
assert.strictEqual(test7, 'draftMaker', 'Expected document format conversion to resolve to draftMaker');
console.log('  ✅ PASS: "Provide in document format" resolves to draftMaker');

// 3. Other Specialized Tools with General Queries
const test8 = resolveEffectiveTool('contractAnalyzer', 'What is your company name?');
assert.strictEqual(test8, 'ai_chat', 'Expected company name in contractAnalyzer to resolve to ai_chat');
console.log('  ✅ PASS: Company name in contractAnalyzer resolves to ai_chat');

const test9 = resolveEffectiveTool('casePredictor', 'Who developed this AI system?');
assert.strictEqual(test9, 'ai_chat', 'Expected identity query in casePredictor to resolve to ai_chat');
console.log('  ✅ PASS: Identity query in casePredictor resolves to ai_chat');

const test10 = resolveEffectiveTool('evidenceAnalyst', 'Thanks for the explanation!');
assert.strictEqual(test10, 'ai_chat', 'Expected conversational thanks in evidenceAnalyst to resolve to ai_chat');
console.log('  ✅ PASS: Conversational thanks resolves to ai_chat');

const test11 = resolveEffectiveTool('legal_my_case', 'What is an FIR?');
assert.strictEqual(test11, 'ai_chat', 'Expected legal_my_case general question to resolve to ai_chat');
console.log('  ✅ PASS: legal_my_case general question resolves to ai_chat');

console.log('================================================================');
console.log('🎉 ALL 11 TESTS PASSED: General queries will NEVER be blocked by specialized tool limits!');
console.log('================================================================');
