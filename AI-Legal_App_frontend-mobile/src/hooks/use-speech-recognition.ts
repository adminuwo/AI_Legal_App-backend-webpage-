import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from '@/api/client';
import { useToastContext } from '@/providers';
import { usePermissionFlow } from '@/providers/permission-provider';

// Safe require for `@react-native-voice/voice` to prevent startup crash in Expo Go
let NativeVoice: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeVoice = require('@react-native-voice/voice').default;
  } catch (e) {
    console.warn('[useSpeechRecognition] Native @react-native-voice/voice module not available. Will use backend Whisper fallback.');
  }
}

export type SpeechLanguage =
  | 'en'
  | 'hi'
  | 'mr'
  | 'ta'
  | 'te'
  | 'bn'
  | 'gu'
  | 'kn'
  | 'pa'
  | 'hinglish'
  | 'auto'
  | string;

export function useSpeechRecognition(onTranscriptionComplete: (text: string) => void) {
  const { showToast } = useToastContext();
  const { requestPermissionFlow } = usePermissionFlow();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [duration, setDuration] = useState(0);

  const durationIntervalRef = useRef<any>(null);
  const recordingInstanceRef = useRef<Audio.Recording | null>(null);
  const webRecognitionRef = useRef<any>(null);
  const selectedLangRef = useRef<SpeechLanguage>('hi');
  const isStartingRef = useRef(false);

  // Helper to map UI language option to BCP-47 codes
  const getLanguageCode = (lang: SpeechLanguage): string => {
    if (!lang) return '';
    const l = String(lang).toLowerCase().trim();
    if (l === 'hi' || l.includes('hindi')) return 'hi-IN';
    if (l === 'hinglish') return 'hi-IN';
    if (l === 'mr' || l.includes('marathi')) return 'mr-IN';
    if (l === 'ta' || l.includes('tamil')) return 'ta-IN';
    if (l === 'te' || l.includes('telugu')) return 'te-IN';
    if (l === 'bn' || l.includes('bengali') || l.includes('bangla')) return 'bn-IN';
    if (l === 'gu' || l.includes('gujarati')) return 'gu-IN';
    if (l === 'kn' || l.includes('kannada')) return 'kn-IN';
    if (l === 'ml' || l.includes('malayalam')) return 'ml-IN';
    if (l === 'pa' || l.includes('punjabi')) return 'pa-IN';
    if (l === 'sa' || l.includes('sanskrit')) return 'sa-IN';
    if (l === 'ur' || l.includes('urdu')) return 'ur-IN';
    if (l === 'or' || l.includes('odia')) return 'or-IN';
    if (l === 'as' || l.includes('assamese')) return 'as-IN';
    if (l === 'ne' || l.includes('nepali')) return 'ne-NP';
    if (l === 'kok' || l.includes('konkani')) return 'gom-IN';
    if (l === 'mai' || l.includes('maithili')) return 'mai-IN';
    if (l === 'doi' || l.includes('dogri')) return 'doi-IN';
    if (l === 'brx' || l.includes('bodo')) return 'brx-IN';
    if (l === 'sat' || l.includes('santali')) return 'sat-IN';
    if (l === 'mni' || l.includes('manipuri')) return 'mni-IN';
    if (l === 'ks' || l.includes('kashmiri')) return 'ks-IN';
    if (l === 'sd' || l.includes('sindhi')) return 'sd-IN';
    if (l === 'auto' || l.includes('auto')) return '';
    if (l === 'en' || l.includes('english')) return 'en-IN';
    return '';
  };

  // --- 1. WEB SPEECH API INITIALIZATION ---
  const initWebSpeech = useCallback((lang: SpeechLanguage) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[useSpeechRecognition] Browser does not support Web Speech API.');
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    const bcpCode = getLanguageCode(lang);
    if (bcpCode) {
      rec.lang = bcpCode;
    }

    rec.onstart = () => {
      setIsRecording(true);
      setDuration(0);
      setPartialText('');
      startDurationTimer();
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      console.log('[Voice Recognition] Partial Result:', currentText);
      setPartialText(currentText);
    };

    rec.onerror = (event: any) => {
      console.error('[useSpeechRecognition] Web recognition error:', event.error);
      if (event.error !== 'aborted') {
        showToast('error', 'Speech Error', `Voice recognition error: ${event.error}`);
      }
      stopDurationTimer();
      setIsRecording(false);
    };

    rec.onend = () => {
      stopDurationTimer();
      setIsRecording(false);
    };

    return rec;
  }, [showToast]);

  // --- 2. NATIVE VOICE LISTENERS ---
  useEffect(() => {
    if (Platform.OS === 'web' || !NativeVoice) return;

    const onSpeechStart = () => {
      setIsRecording(true);
      setDuration(0);
      setPartialText('');
      startDurationTimer();
    };

    const onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        console.log('[Voice Recognition] Partial Result:', e.value[0]);
        setPartialText(e.value[0]);
      }
    };

    const onSpeechPartialResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        console.log('[Voice Recognition] Partial Result:', e.value[0]);
        setPartialText(e.value[0]);
      }
    };

    const onSpeechError = (e: any) => {
      console.error('[useSpeechRecognition] Native recognition error:', e);
      if (e.error?.message?.includes('No match')) {
        // Safe to ignore no match warnings on Android
        return;
      }
      showToast('error', 'Speech Error', 'Unable to recognize speech.');
      stopDurationTimer();
      setIsRecording(false);
    };

    NativeVoice.onSpeechStart = onSpeechStart;
    NativeVoice.onSpeechResults = onSpeechResults;
    NativeVoice.onSpeechPartialResults = onSpeechPartialResults;
    NativeVoice.onSpeechError = onSpeechError;

    return () => {
      NativeVoice.destroy().then(NativeVoice.removeAllListeners);
    };
  }, [showToast]);

  // Timer controls
  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (recordingInstanceRef.current) {
        recordingInstanceRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (Platform.OS === 'web' && webRecognitionRef.current) {
        webRecognitionRef.current.abort();
      }
    };
  }, []);

  // --- 3. SPEECH ACTION TRIGGERS ---
  const startRecording = async (lang: SpeechLanguage) => {
    if (isStartingRef.current || isRecording) {
      console.log('[useSpeechRecognition] startRecording already in progress or recording active. Ignoring concurrent request.');
      return;
    }
    isStartingRef.current = true;

    try {
      selectedLangRef.current = lang;
      setPartialText('');
      setDuration(0);

      // --- Web Flow ---
      if (Platform.OS === 'web') {
        const rec = initWebSpeech(lang);
        if (rec) {
          webRecognitionRef.current = rec;
          try {
            rec.start();
          } catch (e) {
            console.warn('[useSpeechRecognition] Recognition already running:', e);
          }
        } else {
          showToast('error', 'Not Supported', 'Speech recognition is not supported in this browser.');
        }
        return;
      }

      // --- Native: Real-time STT Library Flow ---
      if (NativeVoice) {
        try {
          const langCode = getLanguageCode(lang) || 'hi-IN';
          console.log(`🎙️ [SpeechRecognition] NativeVoice starting with langCode: "${langCode}" (Original Language Preservation Mode)`);
          await NativeVoice.start(langCode, {
            EXTRA_PREFER_OFFLINE: false,
            EXTRA_PARTIAL_RESULTS: true,
          });
          return;
        } catch (e) {
          console.warn('[useSpeechRecognition] NativeVoice start failed, falling back to expo-av:', e);
        }
      }

      // --- Native: Expo AV Whisper Fallback ---
      if (recordingInstanceRef.current) {
        try {
          await recordingInstanceRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.warn('[useSpeechRecognition] Cleanup warning:', e);
        }
        recordingInstanceRef.current = null;
      }

      const micGranted = await requestPermissionFlow('microphone');
      if (!micGranted) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      // Customized recording configuration for clear voice input (noise suppression & echo cancellation)
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 16000, // Whisper works best with 16kHz
          numberOfChannels: 1, // Mono audio is smaller and cleaner for STT
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };

      if (Platform.OS === 'ios' && AppState.currentState !== 'active') {
        console.warn('[useSpeechRecognition] App is in background. Postponing audio session activation.');
        return;
      }

      let recordingObject: Audio.Recording | null = null;
      try {
        const { recording } = await Audio.Recording.createAsync(recordingOptions as any);
        recordingObject = recording;
      } catch (createErr: any) {
        console.warn('[useSpeechRecognition] Initial Audio.Recording.createAsync failed, resetting audio session...', createErr?.message || createErr);
        try {
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (AppState.currentState === 'active') {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              playThroughEarpieceAndroid: false,
            });
            const { recording } = await Audio.Recording.createAsync(recordingOptions as any);
            recordingObject = recording;
          }
        } catch (retryErr: any) {
          console.warn('[useSpeechRecognition] Audio session retry unavailable:', retryErr?.message || retryErr);
        }
      }

      if (!recordingObject) {
        setIsRecording(false);
        showToast('info', 'Microphone Ready', 'Tap microphone when app is active to start voice recording.');
        return;
      }

      recordingInstanceRef.current = recordingObject;
      setIsRecording(true);
      startDurationTimer();
      showToast('info', 'Listening', 'Speak clearly into the microphone.');
    } catch (err: any) {
      console.error('[useSpeechRecognition] Failed to start native recording:', err?.message || err);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopRecording = async () => {
    stopDurationTimer();

    // --- Web Stop ---
    if (Platform.OS === 'web') {
      if (webRecognitionRef.current) {
        webRecognitionRef.current.stop();
        // Delay completion call slightly to ensure final result is received
        setTimeout(() => {
          onTranscriptionComplete(partialText);
          setIsRecording(false);
        }, 300);
      }
      return;
    }

    // --- Native Real-time Stop ---
    if (NativeVoice && isRecording) {
      try {
        await NativeVoice.stop();
        setTimeout(() => {
          onTranscriptionComplete(partialText);
          setIsRecording(false);
        }, 300);
        return;
      } catch (e) {
        console.warn('[useSpeechRecognition] NativeVoice stop failed:', e);
      }
    }

    // --- Native Expo AV Fallback Stop & Whisper Transcribe ---
    if (recordingInstanceRef.current) {
      const recording = recordingInstanceRef.current;
      recordingInstanceRef.current = null;
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        try {
          await recording.stopAndUnloadAsync();
        } catch (stopErr) {
          console.warn('[useSpeechRecognition] stopAndUnloadAsync warning:', stopErr);
        }
        const fileUri = recording.getURI();

        if (!fileUri) {
          throw new Error('No audio file URI found.');
        }

        // Read audio as base64 string
        const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });

        // Determine mime-type based on extension
        const mimeType = Platform.OS === 'ios' ? 'audio/x-m4a' : 'audio/m4a';

        // Call backend Whisper transcriber
        const response = await apiClient.post('/voice/transcribe', {
          audio: base64Audio,
          mimeType,
          language: selectedLangRef.current,
        });

        const transcribedText = response.data?.text || '';
        setPartialText(transcribedText);
        onTranscriptionComplete(transcribedText);
      } catch (err: any) {
        console.error('[useSpeechRecognition] Transcription failed:', err);
        showToast('error', 'Transcription Failed', 'Whisper STT was offline or timed out.');
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const cancelRecording = async () => {
    stopDurationTimer();
    setPartialText('');
    setIsRecording(false);
    setIsTranscribing(false);

    if (Platform.OS === 'web') {
      if (webRecognitionRef.current) {
        webRecognitionRef.current.abort();
      }
      return;
    }

    if (NativeVoice) {
      try {
        await NativeVoice.cancel();
        return;
      } catch (e) {}
    }

    if (recordingInstanceRef.current) {
      try {
        await recordingInstanceRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingInstanceRef.current = null;
      showToast('info', 'Voice Cancelled', 'Recording discarded.');
    }
  };

  return {
    isRecording,
    isTranscribing,
    partialText,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
