import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import officeParser from 'officeparser';
import { subscriptionService } from '../services/subscriptionService.js';
import OpenAI from 'openai';
import { langStorage, getLocaleForLanguage } from '../middleware/langContext.js';

const voiceMap = {
    'hi-IN': { 'FEMALE': 'hi-IN-Chirp3-HD-Kore', 'MALE': 'hi-IN-Chirp3-HD-Charon' },
    'en-US': { 'FEMALE': 'en-US-Chirp3-HD-Autonoe', 'MALE': 'en-US-Chirp3-HD-Puck' },
    'en-IN': { 'FEMALE': 'en-IN-Neural2-A', 'MALE': 'en-IN-Neural2-B' },
    'mr-IN': { 'FEMALE': 'mr-IN-Neural2-A', 'MALE': 'mr-IN-Neural2-B' },
    'ta-IN': { 'FEMALE': 'ta-IN-Neural2-A', 'MALE': 'ta-IN-Neural2-B' },
    'gu-IN': { 'FEMALE': 'gu-IN-Neural2-A', 'MALE': 'gu-IN-Neural2-B' },
    'kn-IN': { 'FEMALE': 'kn-IN-Neural2-A', 'MALE': 'kn-IN-Neural2-B' },
    'ml-IN': { 'FEMALE': 'ml-IN-Neural2-A', 'MALE': 'ml-IN-Neural2-B' },
    'te-IN': { 'FEMALE': 'te-IN-Standard-A', 'MALE': 'te-IN-Standard-B' },
    'pa-IN': { 'FEMALE': 'pa-IN-Standard-A', 'MALE': 'pa-IN-Standard-B' },
    'bn-IN': { 'FEMALE': 'bn-IN-Neural2-A', 'MALE': 'bn-IN-Neural2-B' },
    'or-IN': { 'FEMALE': 'or-IN-Standard-A', 'MALE': 'or-IN-Standard-A' },
    'ur-IN': { 'FEMALE': 'ur-IN-Neural2-A', 'MALE': 'ur-IN-Neural2-B' },
    'as-IN': { 'FEMALE': 'as-IN-Standard-A', 'MALE': 'as-IN-Standard-B' },
    'gom-IN': { 'FEMALE': 'gom-IN-Standard-A', 'MALE': 'gom-IN-Standard-B' },
    'doi-IN': { 'FEMALE': 'doi-IN-Standard-A', 'MALE': 'doi-IN-Standard-B' },
    'mai-IN': { 'FEMALE': 'mai-IN-Standard-A', 'MALE': 'mai-IN-Standard-B' },
    'brx-IN': { 'FEMALE': 'brx-IN-Standard-A', 'MALE': 'brx-IN-Standard-B' },
    'sat-IN': { 'FEMALE': 'sat-IN-Standard-A', 'MALE': 'sat-IN-Standard-B' },
    'mni-IN': { 'FEMALE': 'mni-IN-Standard-A', 'MALE': 'mni-IN-Standard-B' },
    'ne-IN': { 'FEMALE': 'ne-NP-Standard-A', 'MALE': 'ne-NP-Standard-B' },
    'ks-IN': { 'FEMALE': 'ks-IN-Standard-A', 'MALE': 'ks-IN-Standard-B' },
    'sd-IN': { 'FEMALE': 'sd-IN-Standard-A', 'MALE': 'sd-IN-Standard-B' },
    'sa-IN': { 'FEMALE': 'sa-IN-Standard-A', 'MALE': 'sa-IN-Standard-B' }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the service account key file
const keyFilename = path.join(__dirname, '../google_cloud_credentials.json');

// Initialize the client if key exists
// Initialize the client
let client = null;

try {
    if (fs.existsSync(keyFilename)) {
        client = new textToSpeech.TextToSpeechClient({ keyFilename });
        console.log("✅ [VoiceController] Google Cloud TTS Client Initialized with Key File");
    } else {
        console.warn("⚠️ [VoiceController] Key file not found, attempting ADC...");
        // Fallback to ADC
        client = new textToSpeech.TextToSpeechClient();
        console.log("✅ [VoiceController] Google Cloud TTS Client Initialized with ADC");
    }
} catch (err) {
    console.warn("⚠️ [VoiceController] Failed to initialize TTS Client:", err.message);
    try {
        // Last ditch effort: Try ADC if key file init failed
        client = new textToSpeech.TextToSpeechClient();
        console.log("✅ [VoiceController] Google Cloud TTS Client Initialized with ADC (Fallback)");
    } catch (finalErr) {
        console.error("❌ [VoiceController] Critical: TTS Client Init Failed:", finalErr.message);
    }
}

// Helper to chunk text safely for Google TTS (5000 byte limit)
const chunkText = (text, maxLength = 2500) => {
    if (!text) return [];
    const chunks = [];
    let currentPos = 0;
    while (currentPos < text.length) {
        let end = currentPos + maxLength;
        if (end < text.length) {
            // Try to break at a space to avoid cutting words
            const lastSpace = text.lastIndexOf(' ', end);
            if (lastSpace > currentPos) {
                end = lastSpace;
            }
        }
        chunks.push(text.substring(currentPos, end).trim());
        currentPos = end;
    }
    return chunks.filter(c => c.length > 0);
};

// Generic synthesizer that handles chunks
const synthesizeChunks = async (chunks, languageCode, voiceName, gender, isNarrative = false, pitch = 0.0, speakingRate = 1.0) => {
    const audioBuffers = [];
    const BATCH_SIZE = 12;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(chunk => {
            let reqVoiceName = voiceName;
            
            const isUnsupportedVoice = voiceName && (voiceName.includes('Chirp') || voiceName.includes('Journey'));
            const isModified = pitch !== 0 || speakingRate !== 1.0;

            const request = {
                input: { text: chunk },
                voice: { languageCode, name: reqVoiceName },
                audioConfig: { 
                     audioEncoding: 'MP3'
                },
            };

            if (isUnsupportedVoice && isModified) {
                // Infer correct gender for fallback if it's a known male voice
                let finalGender = gender;
                const maleVoices = ['Algieba', 'Alnilam', 'Charon', 'Enceladus', 'Fenrir', 'Iapetus', 'Orus', 'Puck', 'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Umbriel', 'Zubenelgenubi'];
                if (voiceName && maleVoices.some(m => voiceName.includes(m))) {
                    finalGender = 'MALE';
                }

                // Fallback to default voice (which supports pitch/speed adjustments since Chirp/Journey do not)
                delete request.voice.name;
                if (finalGender) {
                    request.voice.ssmlGender = finalGender;
                }
                console.log(`[VoiceController] Falling back from ${voiceName} to default ${finalGender} voice to support pitch/speed parameters.`);
            }

            // Only send pitch and speakingRate if they are modified, or if voice supports it
            if (isModified || !isUnsupportedVoice) {
                request.audioConfig.pitch = pitch;
                request.audioConfig.speakingRate = speakingRate;
            }

            return client.synthesizeSpeech(request).then(([response]) => {
                let data = response.audioContent;
                return Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
            });
        });

        const results = await Promise.all(batchPromises);
        audioBuffers.push(...results);
    }
    return Buffer.concat(audioBuffers);
};

export const synthesizeSpeech = async (req, res) => {
    if (!client) {
        return res.status(403).json({ error: 'Google Cloud TTS not configured' });
    }
    try {
        const { text, languageCode: reqLanguageCode, gender = 'FEMALE', tone, voiceName: reqVoiceName, pitch = 0, speakingRate = 1.0, isBase64 = false } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const store = langStorage.getStore();
        const activeLanguage = req.body?.preferred_response_language || req.body?.language || (store && typeof store === 'object' ? store.language : store) || 'English';

        let languageCode = reqLanguageCode || req.body?.locale || (store && typeof store === 'object' ? store.locale : null) || 'en-US';
        if (!reqLanguageCode && (!req.body?.locale || languageCode === 'en-US') && activeLanguage !== 'English') {
            languageCode = getLocaleForLanguage(activeLanguage);
        }

        // Pre-processing for natural pronunciation
        let processedText = text
            .replace(/[,.-]/g, " ")
            .replace(/\btm\b/gi, "tum")
            .replace(/\bkkrh\b/gi, "kya kar rahe ho")
            .replace(/\bclg\b/gi, "college")
            .replace(/\bplz\b/gi, "please")
            .replace(/\s+/g, " ")
            .trim();

        let voiceName = reqVoiceName || voiceMap[languageCode]?.[gender] || `${languageCode}-Chirp3-HD-${gender === 'MALE' ? 'Puck' : 'Autonoe'}`;
        const isNarrative = tone === 'narrative' || (tone !== 'conversational' && processedText.length > 600);

        const chunks = chunkText(processedText, 2500);
        console.log(`📤 [VoiceController] Synthesizing ${chunks.length} chunks... narrative=${isNarrative} lang=${languageCode} voice=${voiceName}`);

        const audioData = await synthesizeChunks(chunks, languageCode, voiceName, gender, isNarrative, pitch, speakingRate);

        // 💰 Deduct credits on successful output
        if (req.creditMeta && req.creditMeta.cost > 0) {
            await subscriptionService.deductCreditsFromMeta(req.creditMeta);
        }

        if (isBase64) {
            return res.json({ success: true, audioContent: audioData.toString('base64') });
        }

        res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioData.length });
        res.send(audioData);
    } catch (error) {
        console.error('❌ [VoiceController] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to synthesize speech', details: error.message });
    }
};

export const synthesizeFile = async (req, res) => {
    if (!client) return res.status(403).json({ error: 'Google Cloud TTS not configured' });

    try {
        const { fileData, mimeType, languageCode: reqLangCode, gender = 'FEMALE', introText, pitch = 0, speakingRate = 1.0, voiceName: reqVoiceName } = req.body;
        if (!fileData && !introText) return res.status(400).json({ error: 'Input required' });

        const store = langStorage.getStore();
        const activeLanguage = req.body?.preferred_response_language || req.body?.language || (store && typeof store === 'object' ? store.language : store) || 'English';

        let languageCode = reqLangCode || req.body?.locale || (store && typeof store === 'object' ? store.locale : null) || 'en-US';
        if (!reqLangCode && (!req.body?.locale || languageCode === 'en-US') && activeLanguage !== 'English') {
            languageCode = getLocaleForLanguage(activeLanguage);
        }

        let textToRead = "";
        if (fileData) {
            const buffer = Buffer.from(fileData, 'base64');
            console.log(`📦 [SynthesizeFile] Processing ${buffer.length} bytes...`);
            try {
                if (mimeType === 'application/pdf') {
                    const data = await pdfParse(buffer);
                    textToRead = data.text;
                    if (!textToRead || textToRead.trim().length < 5) {
                        const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'eng+hin');
                        textToRead = ocrText;
                    }
                } else if (mimeType.includes('word') || mimeType.endsWith('.docx')) {
                    try { textToRead = await officeParser.parseOfficeAsync(buffer); }
                    catch { const res = await mammoth.extractRawText({ buffer }); textToRead = res.value; }
                } else if (mimeType.startsWith('image/')) {
                    const { data: { text } } = await Tesseract.recognize(buffer, 'eng+hin');
                    textToRead = text;
                } else if (mimeType.startsWith('text/')) {
                    textToRead = buffer.toString('utf-8');
                }
            } catch (e) {
                console.error("Extraction error:", e);
                return res.status(500).json({ error: 'Text extraction failed', details: e.message });
            }
        }

        if (introText) textToRead = `${introText}\n\n${textToRead}`;

        textToRead = textToRead
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
            .replace(/™/g, " T M ")
            .replace(/©/g, "")
            .replace(/\btm\b/gi, "tum")
            // Preserve . , ? ! for natural Chirp 3 HD pauses — only strip truly noise chars
            .replace(/[;:"\\@\[\]\(\)\|_\*`~]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (textToRead.length < 2) return res.status(400).json({ error: 'No readable text found' });

        const isHindi = languageCode === 'hi-IN' || (textToRead.match(/[\u0900-\u097F]/g) || []).length > 20;
        const chunks = chunkText(textToRead, isHindi ? 1200 : 2500);
        const langCode = languageCode || (isHindi ? 'hi-IN' : 'en-US');
        const voiceName = reqVoiceName || voiceMap[langCode]?.[gender] || `${langCode}-Chirp3-HD-${gender === 'MALE' ? 'Puck' : 'Autonoe'}`;

        console.log(`📖 [VoiceController] File Synthesis: ${chunks.length} chunks, ${textToRead.length} chars, lang=${langCode} voice=${voiceName}`);
        const audioData = await synthesizeChunks(chunks, langCode, voiceName, gender, true, pitch, speakingRate);

        // 💰 Deduct credits on successful output
        if (req.creditMeta && req.creditMeta.cost > 0) {
            await subscriptionService.deductCreditsFromMeta(req.creditMeta);
        }

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioData.length,
            'X-Text-Length': textToRead.length.toString(),
            'X-Chunk-Count': chunks.length.toString(),
            'Access-Control-Expose-Headers': 'X-Text-Length, X-Chunk-Count'
        });
        res.send(audioData);
    } catch (error) {
        console.error('❌ [VoiceController] Critical Failure:', error.message);
        res.status(500).json({ error: 'Voice conversion failed', details: error.message });
    }
};

export const transcribeSpeech = async (req, res) => {
    try {
        const { audio, mimeType = 'audio/m4a', language } = req.body;
        if (!audio) {
            return res.status(400).json({ error: 'Audio data is required' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(403).json({ error: 'OpenAI API key not configured on server' });
        }

        const buffer = Buffer.from(audio, 'base64');
        let rawSub = (mimeType.split('/')[1] || 'm4a').split(';')[0].toLowerCase().trim();
        let ext = rawSub.replace(/^x-/, '');
        const validWhisperExts = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
        if (!validWhisperExts.includes(ext)) {
            ext = 'm4a';
        }
        const tempFilename = `temp_transcribe_${Date.now()}.${ext}`;
        const tempFilePath = path.join(__dirname, tempFilename);

        await fs.promises.writeFile(tempFilePath, buffer);
        console.log(`🎙️ [VoiceController] Written temp file for transcription: ${tempFilePath}`);

        try {
            const openai = new OpenAI({ apiKey });
            const transcribeOptions = {
                file: fs.createReadStream(tempFilePath),
                model: 'whisper-1',
                prompt: 'Transcribe the audio exactly in the original spoken language (Devanagari for Hindi/Marathi/Sanskrit, Latin for English/Hinglish, Tamil script for Tamil, etc.). Preserve exact spoken words without translation or rewriting.',
            };
            if (language && !['auto', 'auto detect', 'auto-detect', '', 'en', 'english'].includes(language.toLowerCase().trim())) {
                let isoLang = language.toLowerCase().trim();
                const isoMap = {
                    'hindi': 'hi', 'hi': 'hi', 'hinglish': 'hi',
                    'marathi': 'mr', 'mr': 'mr',
                    'tamil': 'ta', 'ta': 'ta',
                    'gujarati': 'gu', 'gu': 'gu',
                    'kannada': 'kn', 'kn': 'kn',
                    'malayalam': 'ml', 'ml': 'ml',
                    'telugu': 'te', 'te': 'te',
                    'punjabi': 'pa', 'pa': 'pa',
                    'bengali': 'bn', 'bn': 'bn', 'bangla': 'bn',
                    'odia': 'or', 'or': 'or',
                    'urdu': 'ur', 'ur': 'ur',
                    'assamese': 'as', 'as': 'as',
                    'nepali': 'ne', 'ne': 'ne',
                    'sanskrit': 'sa', 'sa': 'sa'
                };
                if (isoMap[isoLang]) {
                    transcribeOptions.language = isoMap[isoLang];
                } else if (isoLang.includes('hindi')) transcribeOptions.language = 'hi';
                else if (isoLang.includes('marathi')) transcribeOptions.language = 'mr';
                else if (isoLang.includes('tamil')) transcribeOptions.language = 'ta';
                else if (isoLang.includes('telugu')) transcribeOptions.language = 'te';
                else if (isoLang.includes('bengali')) transcribeOptions.language = 'bn';
                else if (isoLang.includes('gujarati')) transcribeOptions.language = 'gu';
                else if (isoLang.includes('kannada')) transcribeOptions.language = 'kn';
                else if (isoLang.includes('punjabi')) transcribeOptions.language = 'pa';
                else if (isoLang.includes('sanskrit')) transcribeOptions.language = 'sa';
                else if (isoLang.includes('urdu')) transcribeOptions.language = 'ur';
            }
            // Use OpenAI Speech-to-Text transcriptions (preserves original spoken language natively)
            const response = await openai.audio.transcriptions.create(transcribeOptions);

            console.log(`🎙️ [VoiceController] Transcription result: "${response.text}"`);
            
            try { await fs.promises.unlink(tempFilePath); } catch (e) {}

            return res.json({ text: response.text });
        } catch (openaiErr) {
            console.error('❌ [VoiceController] OpenAI Whisper Error:', openaiErr.message);
            try { await fs.promises.unlink(tempFilePath); } catch (e) {}
            return res.status(500).json({ error: 'OpenAI transcription failed', details: openaiErr.message });
        }
    } catch (error) {
        console.error('❌ [VoiceController] Transcribe Error:', error.message);
        return res.status(500).json({ error: 'Failed to transcribe speech', details: error.message });
    }
};
