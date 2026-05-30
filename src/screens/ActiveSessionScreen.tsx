import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Vibration,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { RootStackParamList, SessionStep, SessionGoal } from '../types';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { Colors, Spacing, Radius, ButtonSize } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActiveSession'>;
  route: RouteProp<RootStackParamList, 'ActiveSession'>;
};

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function goalLabel(goal: SessionGoal): string {
  return goal === 'WORK_MODE' ? 'WORK' : 'NIGHT';
}

function goalColor(goal: SessionGoal): string {
  return goal === 'WORK_MODE' ? Colors.orange : Colors.blue;
}

function stepAccentColor(step: SessionStep): string {
  if (step.triggerAction === 'STIR') return Colors.stir;
  if (step.triggerAction === 'FINISH') return Colors.success;
  if (step.targetTemp >= 200) return Colors.blue;
  return Colors.orange;
}

export default function ActiveSessionScreen({ navigation, route }: Props) {
  const { steps: stepsJson, strainName, goal } = route.params;
  const steps: SessionStep[] = JSON.parse(stepsJson);

  const handleComplete = useCallback(() => {
    Vibration.vibrate([0, 300, 200, 300]);
  }, []);

  const [state, actions] = useSessionTimer(steps, handleComplete);

  const {
    currentStepIndex,
    displayTimeRemaining,
    isPaused,
    isAwaitingConfirmation,
    isComplete,
    puffCount,
    progressPercent,
  } = state;

  const currentStep = steps[currentStepIndex] ?? null;
  const accent = currentStep ? stepAccentColor(currentStep) : Colors.orange;

  // Keep screen on during active session
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const handleEndSession = () => {
    Alert.alert('End Session', 'Are you sure you want to end this session early?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: () => navigation.popToTop(),
      },
    ]);
  };

  // --- Complete state ---
  if (isComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.completedContainer}>
          <Text style={styles.completedEmoji}>✓</Text>
          <Text style={styles.completedTitle}>SESSION COMPLETE</Text>
          <Text style={styles.completedSub}>{strainName}</Text>
          <View style={styles.puffSummary}>
            <Text style={styles.puffSummaryLabel}>TOTAL PUFFS LOGGED</Text>
            <Text style={styles.puffSummaryCount}>{puffCount}</Text>
          </View>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Stir confirmation state ---
  if (isAwaitingConfirmation && currentStep) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <View style={styles.stirContainer}>
          <View style={[styles.stirIconRing, { borderColor: Colors.stir }]}>
            <Text style={styles.stirIcon}>⟳</Text>
          </View>
          <Text style={[styles.stirTitle, { color: Colors.stir }]}>STIR ALERT</Text>
          <Text style={[styles.stirTemp, { color: Colors.stir }]}>
            {currentStep.targetTemp}°C — HOLD
          </Text>
          <Text style={styles.stirInstruction}>{currentStep.uiInstruction}</Text>
          <TouchableOpacity
            style={[styles.stirConfirmButton, { backgroundColor: Colors.stir }]}
            onPress={actions.confirmStir}
            activeOpacity={0.85}
          >
            <Text style={styles.stirConfirmText}>DONE — CONTINUE</Text>
          </TouchableOpacity>
          <View style={styles.stirPuffRow}>
            <TouchableOpacity
              style={styles.puffCounterBtn}
              onPress={actions.incrementPuff}
              activeOpacity={0.8}
            >
              <Text style={styles.puffCounterCount}>{puffCount}</Text>
              <Text style={styles.puffCounterLabel}>PUFFS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentStep) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.strainName}>{strainName}</Text>
          <Text style={[styles.goalBadge, { color: goalColor(goal) }]}>
            {goalLabel(goal)} MODE
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleEndSession}
          style={styles.endBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.endBtnText}>END</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accent }]}
        />
      </View>

      {/* Step breadcrumb */}
      <View style={styles.stepBreadcrumb}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.breadcrumbDot,
              {
                backgroundColor:
                  i < currentStepIndex
                    ? accent
                    : i === currentStepIndex
                    ? accent
                    : Colors.border,
                opacity: i === currentStepIndex ? 1 : i < currentStepIndex ? 0.6 : 0.3,
                width: i === currentStepIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Step info */}
        <View style={styles.stepInfoRow}>
          <Text style={styles.stepCounter}>
            STEP {currentStepIndex + 1}/{steps.length}
          </Text>
          <Text style={styles.stepNameDisplay}>{currentStep.stepName}</Text>
        </View>

        {/* Temperature — the primary instruction */}
        <View style={[styles.tempCard, { borderColor: `${accent}40` }]}>
          <Text style={styles.tempLabel}>SET DEVICE TO</Text>
          <Text style={[styles.tempDisplay, { color: accent }]}>{currentStep.targetTemp}°C</Text>
        </View>

        {/* Countdown */}
        <View style={styles.countdownContainer}>
          {isPaused && (
            <Text style={styles.pausedBadge}>PAUSED</Text>
          )}
          <Text
            style={[
              styles.countdown,
              isPaused && { color: Colors.textMuted },
            ]}
          >
            {formatCountdown(Math.max(0, displayTimeRemaining))}
          </Text>
        </View>

        {/* Instruction text */}
        <Text style={styles.instructionText}>{currentStep.uiInstruction}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Secondary row: Skip + Add Time */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={actions.skipStep}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryBtnText}>SKIP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => actions.addTime(60)}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryBtnText}>+1 MIN</Text>
          </TouchableOpacity>
        </View>

        {/* Primary: Pause / Resume */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: isPaused ? Colors.success : `${Colors.orange}20` },
            { borderColor: isPaused ? Colors.success : Colors.orange },
          ]}
          onPress={isPaused ? actions.resume : actions.pause}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.primaryBtnText,
              { color: isPaused ? Colors.background : Colors.orange },
            ]}
          >
            {isPaused ? '▶  RESUME' : '⏸  PAUSE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Puff counter — floating bottom right */}
      <TouchableOpacity
        style={styles.puffCounter}
        onPress={actions.incrementPuff}
        activeOpacity={0.7}
      >
        <Text style={styles.puffCounterNum}>{puffCount}</Text>
        <Text style={styles.puffCounterLbl}>PUFFS</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // -- Top bar --
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  strainName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  goalBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  endBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  endBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },

  // -- Progress --
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    minWidth: 6,
  },
  stepBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  breadcrumbDot: {
    height: 8,
    borderRadius: 4,
  },

  // -- Main content --
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  stepInfoRow: {
    alignItems: 'center',
    gap: 4,
  },
  stepCounter: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  stepNameDisplay: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tempCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    minWidth: 220,
  },
  tempLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  tempDisplay: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  pausedBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  countdown: {
    fontSize: 88,
    fontWeight: '800',
    letterSpacing: -3,
    color: Colors.textPrimary,
    // Tabular figures for stable width
    fontVariant: ['tabular-nums'],
  },
  instructionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // -- Controls --
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    height: ButtonSize.secondary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textSecondary,
  },
  primaryBtn: {
    height: ButtonSize.primary,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // -- Puff counter FAB --
  puffCounter: {
    position: 'absolute',
    bottom: 110,
    right: Spacing.lg,
    width: ButtonSize.icon,
    height: ButtonSize.icon,
    borderRadius: ButtonSize.icon / 2,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puffCounterNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  puffCounterLbl: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },

  // -- Completed state --
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  completedEmoji: {
    fontSize: 72,
    color: Colors.success,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  completedSub: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  puffSummary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  puffSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  puffSummaryCount: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  doneButton: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    height: ButtonSize.primary,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 3,
    color: Colors.background,
  },

  // -- Stir state --
  stirContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  stirIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stirIcon: {
    fontSize: 52,
    color: Colors.stir,
  },
  stirTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  stirTemp: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stirInstruction: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  stirConfirmButton: {
    width: '100%',
    height: ButtonSize.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  stirConfirmText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.background,
  },
  stirPuffRow: {
    marginTop: Spacing.sm,
  },
  puffCounterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puffCounterCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  puffCounterLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
  },
});
