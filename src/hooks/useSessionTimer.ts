import { useRef, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Speech from 'expo-speech';
import { SessionStep } from '../types';
import {
  scheduleStepEndNotification,
  scheduleStirNotification,
  cancelNotification,
  cancelAllSessionNotifications,
} from '../services/notifications';
import { completedDurationSeconds, totalSessionDurationSeconds } from '../engine/recipeEngine';

interface TimerState {
  currentStepIndex: number;
  displayTimeRemaining: number; // seconds, clamped to 0
  isPaused: boolean;
  isAwaitingConfirmation: boolean;
  isComplete: boolean;
  puffCount: number;
  progressPercent: number;
}

interface TimerActions {
  pause: () => void;
  resume: () => void;
  skipStep: () => void;
  addTime: (seconds: number) => void;
  confirmStir: () => void;
  incrementPuff: () => void;
}

export function useSessionTimer(
  steps: SessionStep[],
  onComplete: () => void
): [TimerState, TimerActions] {
  const [stepIndex, setStepIndex] = useState(0);
  const [puffCount, setPuffCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [displayTime, setDisplayTime] = useState(steps[0]?.durationSeconds ?? 0);

  // effectiveStart: adjusted Unix ms timestamp such that
  //   elapsed = Date.now() - effectiveStart
  // Pausing shifts effectiveStart forward to freeze elapsed time.
  const effectiveStart = useRef<number>(Date.now());
  const pausedAt = useRef<number | null>(null);
  const frozenDisplay = useRef<number>(steps[0]?.durationSeconds ?? 0);
  const pendingNotifId = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIndexRef = useRef(0);

  const currentStep = steps[stepIndex] ?? null;
  const totalDuration = totalSessionDurationSeconds(steps);

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const cancelPendingNotif = useCallback(async () => {
    if (pendingNotifId.current) {
      await cancelNotification(pendingNotifId.current);
      pendingNotifId.current = null;
    }
  }, []);

  // Speak a TTS prompt — auto-detect Hebrew vs English
  const speak = useCallback((text: string) => {
    const language = /[֐-׿]/.test(text) ? 'he-IL' : 'en-US';
    Speech.speak(text, { language, rate: 0.9, pitch: 1.0 });
  }, []);

  // Advance to the next step (or finish)
  const advanceStep = useCallback(
    async (fromIndex: number) => {
      await cancelPendingNotif();
      const nextIndex = fromIndex + 1;

      if (nextIndex >= steps.length) {
        clearTick();
        setIsComplete(true);
        setDisplayTime(0);
        speak('הסשן הסתיים. כל הכבוד!');
        await cancelAllSessionNotifications();
        onComplete();
        return;
      }

      const nextStep = steps[nextIndex];
      stepIndexRef.current = nextIndex;
      setStepIndex(nextIndex);
      setIsAwaitingConfirmation(nextStep.requiresUserConfirmation);

      speak(nextStep.audioPrompt);

      if (nextStep.requiresUserConfirmation) {
        // durationSeconds === 0 for stir steps — freeze clock until confirmation
        clearTick();
        setDisplayTime(0);
        frozenDisplay.current = 0;
        const id = await scheduleStirNotification(1);
        pendingNotifId.current = id;
        return;
      }

      // Start new step timer
      const now = Date.now();
      effectiveStart.current = now;
      setDisplayTime(nextStep.durationSeconds);
      frozenDisplay.current = nextStep.durationSeconds;
      setIsPaused(false);
      pausedAt.current = null;

      // Schedule step-end notification using the next step's audio prompt
      const nextNextStep = steps[nextIndex + 1];
      const notifText = nextNextStep?.audioPrompt ?? 'הסשן מסתיים.';
      const id = await scheduleStepEndNotification(
        nextStep.stepName,
        notifText,
        nextNextStep?.targetTemp ?? 0,
        nextStep.durationSeconds
      );
      pendingNotifId.current = id;
    },
    [steps, cancelPendingNotif, clearTick, speak, onComplete]
  );

  // Foreground tick — derives time from timestamps, never from a counter
  const startTick = useCallback(
    (forStepIndex: number) => {
      clearTick();
      tickRef.current = setInterval(() => {
        const step = steps[forStepIndex];
        if (!step || step.requiresUserConfirmation) return;

        const elapsed = (Date.now() - effectiveStart.current) / 1000;
        const remaining = Math.max(0, step.durationSeconds - elapsed);
        setDisplayTime(Math.ceil(remaining));

        if (remaining <= 0) {
          clearTick();
          advanceStep(forStepIndex);
        }
      }, 250); // 250ms tick for smooth display without battery drain
    },
    [steps, clearTick, advanceStep]
  );

  // Resync display after foregrounding (handles OS-throttled intervals)
  const resync = useCallback(() => {
    const idx = stepIndexRef.current;
    const step = steps[idx];
    if (!step || step.requiresUserConfirmation) return;

    if (isPaused && pausedAt.current !== null) {
      setDisplayTime(Math.ceil(frozenDisplay.current));
      return;
    }

    const elapsed = (Date.now() - effectiveStart.current) / 1000;
    const remaining = Math.max(0, step.durationSeconds - elapsed);
    setDisplayTime(Math.ceil(remaining));

    if (remaining <= 0) {
      advanceStep(idx);
    } else {
      startTick(idx);
    }
  }, [steps, isPaused, advanceStep, startTick]);

  // AppState listener: resync when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resync();
      } else if (nextState === 'background' || nextState === 'inactive') {
        clearTick(); // let scheduled notifications handle background alerts
      }
    });
    return () => sub.remove();
  }, [resync, clearTick]);

  // Initialize first step on mount
  useEffect(() => {
    const firstStep = steps[0];
    if (!firstStep) return;

    speak(firstStep.audioPrompt);
    setDisplayTime(firstStep.durationSeconds);
    frozenDisplay.current = firstStep.durationSeconds;

    if (firstStep.requiresUserConfirmation) {
      setIsAwaitingConfirmation(true);
      return;
    }

    effectiveStart.current = Date.now();

    (async () => {
      const nextStep = steps[1];
      const id = await scheduleStepEndNotification(
        firstStep.stepName,
        nextStep?.audioPrompt ?? 'הסשן מסתיים.',
        nextStep?.targetTemp ?? 0,
        firstStep.durationSeconds
      );
      pendingNotifId.current = id;
    })();

    startTick(0);

    return () => {
      clearTick();
      cancelAllSessionNotifications();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Actions ---

  const pause = useCallback(() => {
    if (isPaused || isAwaitingConfirmation || isComplete) return;
    clearTick();
    const now = Date.now();
    const elapsed = (now - effectiveStart.current) / 1000;
    const step = steps[stepIndexRef.current];
    const remaining = step ? Math.max(0, step.durationSeconds - elapsed) : 0;
    frozenDisplay.current = remaining;
    pausedAt.current = now;
    setIsPaused(true);
    setDisplayTime(Math.ceil(remaining));
    cancelPendingNotif();
  }, [isPaused, isAwaitingConfirmation, isComplete, steps, clearTick, cancelPendingNotif]);

  const resume = useCallback(() => {
    if (!isPaused || isAwaitingConfirmation || isComplete) return;
    const now = Date.now();
    // Shift effectiveStart forward by pause duration so elapsed stays correct
    if (pausedAt.current !== null) {
      effectiveStart.current += now - pausedAt.current;
    }
    pausedAt.current = null;
    setIsPaused(false);

    const idx = stepIndexRef.current;
    const step = steps[idx];
    if (!step) return;

    const remaining = Math.max(0, step.durationSeconds - (now - effectiveStart.current) / 1000);

    (async () => {
      const nextStep = steps[idx + 1];
      const id = await scheduleStepEndNotification(
        step.stepName,
        nextStep?.audioPrompt ?? 'הסשן מסתיים.',
        nextStep?.targetTemp ?? 0,
        remaining
      );
      pendingNotifId.current = id;
    })();

    startTick(idx);
  }, [isPaused, isAwaitingConfirmation, isComplete, steps, startTick]);

  const skipStep = useCallback(() => {
    if (isComplete) return;
    clearTick();
    advanceStep(stepIndexRef.current);
  }, [isComplete, clearTick, advanceStep]);

  const addTime = useCallback(
    (seconds: number) => {
      if (isComplete || isAwaitingConfirmation) return;
      // Shift effectiveStart back in time to add to remaining
      effectiveStart.current -= seconds * 1000;
      if (isPaused && pausedAt.current !== null) {
        frozenDisplay.current += seconds;
        setDisplayTime((t) => t + seconds);
      }
      cancelPendingNotif().then(async () => {
        const idx = stepIndexRef.current;
        const step = steps[idx];
        if (!step) return;
        const elapsed = (Date.now() - effectiveStart.current) / 1000;
        const remaining = Math.max(0, step.durationSeconds - elapsed);
        const nextStep = steps[idx + 1];
        const id = await scheduleStepEndNotification(
          step.stepName,
          nextStep?.audioPrompt ?? 'הסשן מסתיים.',
          nextStep?.targetTemp ?? 0,
          remaining
        );
        pendingNotifId.current = id;
      });
    },
    [isComplete, isAwaitingConfirmation, isPaused, steps, cancelPendingNotif]
  );

  const confirmStir = useCallback(() => {
    if (!isAwaitingConfirmation) return;
    setIsAwaitingConfirmation(false);
    cancelPendingNotif();
    speak('ממשיכים. כל הכבוד.');
    advanceStep(stepIndexRef.current);
  }, [isAwaitingConfirmation, cancelPendingNotif, speak, advanceStep]);

  const incrementPuff = useCallback(() => {
    setPuffCount((c) => c + 1);
  }, []);

  // Progress calculation
  const elapsed = isPaused
    ? completedDurationSeconds(
        steps,
        stepIndex,
        currentStep ? Math.max(0, currentStep.durationSeconds - frozenDisplay.current) : 0
      )
    : completedDurationSeconds(
        steps,
        stepIndex,
        currentStep
          ? Math.max(0, currentStep.durationSeconds - (Date.now() - effectiveStart.current) / 1000)
          : 0
      );
  const progressPercent = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

  const state: TimerState = {
    currentStepIndex: stepIndex,
    displayTimeRemaining: displayTime,
    isPaused,
    isAwaitingConfirmation,
    isComplete,
    puffCount,
    progressPercent,
  };

  const actions: TimerActions = {
    pause,
    resume,
    skipStep,
    addTime,
    confirmStir,
    incrementPuff,
  };

  return [state, actions];
}
