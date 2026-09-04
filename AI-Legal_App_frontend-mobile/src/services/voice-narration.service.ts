/**
 * AI Legal Mobile - Voice Narration Service
 * Manages text-to-speech narration for onboarding and interactive features
 * with language localization, female advocate voice selection, and lip-sync state callbacks.
 */

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { StorageService } from './storage.service';

const VOICE_ENABLED_KEY = '@onboarding_voice_enabled';

export const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
  Gujarati: 'gu-IN',
  Kannada: 'kn-IN',
  Punjabi: 'pa-IN',
  Malayalam: 'ml-IN',
  Urdu: 'ur-IN',
  Odia: 'or-IN',
  Assamese: 'as-IN',
  Sanskrit: 'sa-IN',
  Konkani: 'kok-IN',
  Manipuri: 'mni-IN',
  Dogri: 'doi-IN',
  Bodo: 'brx-IN',
  Maithili: 'mai-IN',
  Santali: 'sat-IN',
  Kashmiri: 'ks-IN',
  Nepali: 'ne-NP',
  Sindhi: 'sd-IN',
  Hinglish: 'hi-IN',
  Bilingual: 'en-IN',
};

const ONBOARDING_AUDIO_MAP: Record<number, any> = {
  0: require('../../assets/voice/card1.mp3'),
  1: require('../../assets/voice/card2.mp3'),
  2: require('../../assets/voice/card3.mp3'),
  3: require('../../assets/voice/card4.mp3'),
  4: require('../../assets/voice/card5.mp3'),
  5: require('../../assets/voice/card6.mp3'),
  6: require('../../assets/voice/card7.mp3'),
};

export interface NarrationOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: any) => void;
  onStopped?: () => void;
  onDurationKnown?: (durationMs: number) => void;
}

export class VoiceNarrationService {
  private static isSpeakingActive = false;
  private static currentSound: Audio.Sound | null = null;

  /**
   * Check whether voice narration is enabled in user preferences.
   */
  static async isVoiceEnabled(): Promise<boolean> {
    try {
      const val = await StorageService.getItem(VOICE_ENABLED_KEY);
      return val !== 'false'; // Default to true if not set
    } catch (e) {
      console.warn('[VOICE NARRATION] Error reading voice preference:', e);
      return true;
    }
  }

  /**
   * Set user preference for voice narration (Persisted locally).
   */
  static async setVoiceEnabled(enabled: boolean): Promise<void> {
    try {
      await StorageService.setItem(VOICE_ENABLED_KEY, enabled ? 'true' : 'false');
      if (!enabled) {
        await this.stop();
      }
    } catch (e) {
      console.warn('[VOICE NARRATION] Error saving voice preference:', e);
    }
  }

  /**
   * Play pre-recorded natural audio file for a specific onboarding slide index.
   */
  static async playSlideAudio(slideIndex: number, options?: NarrationOptions): Promise<void> {
    const enabled = await this.isVoiceEnabled();
    if (!enabled) {
      options?.onDone?.();
      return;
    }

    try {
      await this.stop();

      const audioAsset = ONBOARDING_AUDIO_MAP[slideIndex];
      if (!audioAsset) {
        options?.onDone?.();
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound, status } = await Audio.Sound.createAsync(
        audioAsset,
        { shouldPlay: true },
        (playbackStatus) => {
          if (!playbackStatus.isLoaded) return;
          if (playbackStatus.didJustFinish) {
            this.isSpeakingActive = false;
            options?.onDone?.();
            this.cleanupSound();
          }
        }
      );

      this.currentSound = sound;
      this.isSpeakingActive = true;
      options?.onStart?.();

      if (status.isLoaded && status.durationMillis) {
        options?.onDurationKnown?.(status.durationMillis);
      }
    } catch (err) {
      console.warn('[VOICE NARRATION] Audio playback exception:', err);
      this.isSpeakingActive = false;
      options?.onError?.(err);
      options?.onDone?.();
    }
  }

  private static async cleanupSound(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.unloadAsync();
      } catch (e) {
        // ignore
      }
      this.currentSound = null;
    }
  }

  /**
   * Speak the target onboarding text with synchronized callbacks (TTS fallback).
   */
  static async speak(text: string, options?: NarrationOptions): Promise<void> {
    const enabled = await this.isVoiceEnabled();
    if (!enabled) {
      options?.onDone?.();
      return;
    }

    try {
      await this.stop();

      const langName = options?.language || 'English';
      const locale = LANGUAGE_LOCALE_MAP[langName] || 'en-IN';
      const rate = options?.rate ?? 0.92;
      const pitch = options?.pitch ?? 1.05;

      this.isSpeakingActive = true;

      let selectedVoice: string | undefined = undefined;
      if (Platform.OS !== 'web') {
        try {
          const availableVoices = await Speech.getAvailableVoicesAsync();
          const matchingVoice = availableVoices.find(
            (v) =>
              (v.language?.toLowerCase().includes(locale.toLowerCase()) ||
                v.language?.toLowerCase().includes(locale.substring(0, 2))) &&
              (v.name?.toLowerCase().includes('female') ||
                v.name?.toLowerCase().includes('natural') ||
                v.name?.toLowerCase().includes('google') ||
                v.name?.toLowerCase().includes('siri') ||
                v.name?.toLowerCase().includes('samantha') ||
                v.name?.toLowerCase().includes('veena'))
          );
          if (matchingVoice) {
            selectedVoice = matchingVoice.identifier;
          }
        } catch (voiceErr) {
          console.log('[VOICE NARRATION] Voice discovery fallback:', voiceErr);
        }
      }

      Speech.speak(text, {
        language: locale,
        voice: selectedVoice,
        rate,
        pitch,
        onStart: () => {
          this.isSpeakingActive = true;
          options?.onStart?.();
        },
        onDone: () => {
          this.isSpeakingActive = false;
          options?.onDone?.();
        },
        onStopped: () => {
          this.isSpeakingActive = false;
          options?.onStopped?.();
        },
        onError: (err) => {
          console.warn('[VOICE NARRATION] Speech playback warning/fallback:', err);
          this.isSpeakingActive = false;
          options?.onError?.(err);
          options?.onDone?.();
        },
      });
    } catch (err) {
      console.warn('[VOICE NARRATION] Speech initialization exception:', err);
      this.isSpeakingActive = false;
      options?.onError?.(err);
      options?.onDone?.();
    }
  }

  /**
   * Alias method for speak with explicit language param as specified in implementation plan.
   */
  static async speakText(text: string, language?: string, options?: NarrationOptions): Promise<void> {
    return this.speak(text, { ...options, language });
  }

  /**
   * Immediately stop ongoing narration playback.
   */
  static async stop(): Promise<void> {
    try {
      this.isSpeakingActive = false;
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
        } catch (e) {
          // ignore
        }
        this.currentSound = null;
      }
      await Speech.stop();
    } catch (e) {
      console.warn('[VOICE NARRATION] Error stopping speech:', e);
      this.currentSound = null;
    }
  }

  /**
   * Alias method for stop as specified in implementation plan.
   */
  static async stopSpeech(): Promise<void> {
    return this.stop();
  }

  /**
   * Check if speech is currently active.
   */
  static getSpeakingState(): boolean {
    return this.isSpeakingActive;
  }

  /**
   * Alias method for getSpeakingState as specified in implementation plan.
   */
  static isSpeaking(): boolean {
    return this.getSpeakingState();
  }
}

