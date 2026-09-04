import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Custom hook to safely run intervals that automatically:
 * 1. Pause when the screen loses focus (user navigates to another tab or screen)
 * 2. Pause when the app is backgrounded
 * 3. Resume when the screen is focused and app is active
 * 4. Guarantee cleanup on component unmount
 */
export function useFocusInterval(callback: () => void, delay: number | null) {
  const isFocused = useIsFocused();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || !isFocused) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!intervalId && delay !== null) {
        intervalId = setInterval(() => {
          savedCallback.current();
        }, delay);
      }
    };

    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (AppState.currentState === 'active') {
      startTimer();
    }

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && isFocused) {
        startTimer();
      } else {
        stopTimer();
      }
    });

    return () => {
      stopTimer();
      appStateSub.remove();
    };
  }, [isFocused, delay]);
}
