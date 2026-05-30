import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, SessionStep, SavedRecipe } from '../types';
import { getStrainById } from '../data/strains';
import { generateRecipe } from '../engine/recipeEngine';
import { Colors, Typography, Spacing, Radius, ButtonSize } from '../theme';
import { saveRecipe } from '../services/storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoutineEditor'>;
  route: RouteProp<RootStackParamList, 'RoutineEditor'>;
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return 'MANUAL';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function stepAccentColor(step: SessionStep): string {
  if (step.triggerAction === 'STIR') return Colors.stir;
  if (step.triggerAction === 'FINISH') return Colors.success;
  if (step.targetTemp >= 200) return Colors.blue;
  return Colors.orange;
}

export default function RoutineEditorScreen({ navigation, route }: Props) {
  const { strainId, strainName: routeStrainName, goal, preGeneratedSteps } = route.params;

  const strain = strainId ? getStrainById(strainId) : undefined;

  // Derive the display name for headers and navigation
  const displayName =
    routeStrainName ??
    (strain ? (strain.grower ? `${strain.name} · ${strain.grower}` : strain.name) : '');

  const isAIPlan = !!preGeneratedSteps;

  const [steps, setSteps] = useState<SessionStep[]>(() => {
    if (preGeneratedSteps) {
      try {
        return JSON.parse(preGeneratedSteps) as SessionStep[];
      } catch {
        return [];
      }
    }
    if (strain) return generateRecipe(strain, goal);
    return [];
  });

  const totalSeconds = steps.reduce((s, step) => s + step.durationSeconds, 0);
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  const adjustDuration = useCallback((index: number, delta: number) => {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index) return step;
        if (step.requiresUserConfirmation) return step;
        const next = Math.max(30, step.durationSeconds + delta);
        return { ...step, durationSeconds: next };
      })
    );
  }, []);

  const adjustTemp = useCallback((index: number, delta: number) => {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index) return step;
        const next = Math.max(160, Math.min(230, step.targetTemp + delta));
        return { ...step, targetTemp: next };
      })
    );
  }, []);

  const handleStart = () => {
    if (steps.length === 0) {
      Alert.alert('שגיאה', 'לא נמצאו שלבים בתוכנית.');
      return;
    }
    navigation.navigate('ActiveSession', {
      steps: JSON.stringify(steps),
      strainName: displayName,
      goal,
    });
  };

  const handleReset = () => {
    if (isAIPlan) {
      Alert.alert(
        'תוכנית AI',
        'חזור למסך הבית וייצר מחדש כדי לקבל תוכנית AI חדשה.',
        [{ text: 'אישור' }]
      );
      return;
    }
    if (strain) {
      setSteps(generateRecipe(strain, goal));
    }
  };

  const handleSave = () => {
    const recipeId = strain
      ? `${strain.id}_${goal}_${Date.now()}`
      : `${displayName.replace(/\s+/g, '_').toLowerCase()}_${goal}_${Date.now()}`;

    const doSave = async (name: string) => {
      const recipe: SavedRecipe = {
        id: recipeId,
        name: name.trim(),
        strainId: strain?.id ?? '',
        goal,
        steps,
        savedAt: Date.now(),
      };
      await saveRecipe(recipe);
      Alert.alert('נשמר', `"${recipe.name}" נשמרה לתוכניות שלך.`);
    };

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'שמור תוכנית',
        'תן לתוכנית שם:',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'שמור',
            onPress: (name) => {
              if (name?.trim()) doSave(name);
            },
          },
        ],
        'plain-text',
        displayName
      );
    } else {
      setSaveName(displayName);
      setSaveNameVisible(true);
    }
  };

  const [saveNameVisible, setSaveNameVisible] = useState(false);
  const [saveName, setSaveName] = useState(displayName);

  const renderStep = ({ item, index }: { item: SessionStep; index: number }) => {
    const accent = stepAccentColor(item);
    const isStir = item.requiresUserConfirmation;

    return (
      <View style={[styles.stepCard, { borderLeftColor: accent }]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepIndexBadge}>
            <Text style={[styles.stepIndexText, { color: accent }]}>{index + 1}</Text>
          </View>
          <View style={styles.stepHeaderCenter}>
            <Text style={styles.stepName}>{item.stepName}</Text>
            {isStir && (
              <View style={[styles.stirBadge, { backgroundColor: `${Colors.stir}25` }]}>
                <Text style={[styles.stirBadgeText, { color: Colors.stir }]}>עצירה ידנית</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.stepInstruction}>{item.uiInstruction}</Text>

        <View style={styles.stepControls}>
          {/* Temperature control */}
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>טמפ׳</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.adjBtn}
                onPress={() => adjustTemp(index, -5)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.adjBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.controlValue, { color: accent }]}>{item.targetTemp}°C</Text>
              <TouchableOpacity
                style={styles.adjBtn}
                onPress={() => adjustTemp(index, 5)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.adjBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration control */}
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>משך</Text>
            <View style={styles.controlRow}>
              {!isStir ? (
                <>
                  <TouchableOpacity
                    style={styles.adjBtn}
                    onPress={() => adjustDuration(index, -30)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.adjBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.controlValue}>{formatDuration(item.durationSeconds)}</Text>
                  <TouchableOpacity
                    style={styles.adjBtn}
                    onPress={() => adjustDuration(index, 30)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.adjBtnText}>+</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.controlValue, { color: Colors.stir }]}>ידני</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← חזור</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>תוכנית</Text>
          {displayName ? (
            <Text style={styles.headerSub}>
              {displayName} ·{' '}
              <Text style={{ color: goal === 'WORK_MODE' ? Colors.orange : Colors.blue }}>
                {goal === 'WORK_MODE' ? 'WORK' : 'NIGHT'}
              </Text>
              {isAIPlan && (
                <Text style={{ color: Colors.blue }}> · AI</Text>
              )}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>שמור</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{isAIPlan ? '—' : 'איפוס'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Android: inline save name input */}
      {saveNameVisible && (
        <View style={styles.saveNameRow}>
          <TextInput
            style={styles.saveNameInput}
            value={saveName}
            onChangeText={setSaveName}
            placeholder="שם התוכנית..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <TouchableOpacity
            style={styles.saveNameConfirm}
            onPress={async () => {
              if (saveName.trim()) {
                const recipe: SavedRecipe = {
                  id: `${strain?.id ?? displayName.replace(/\s+/g, '_').toLowerCase()}_${goal}_${Date.now()}`,
                  name: saveName.trim(),
                  strainId: strain?.id ?? '',
                  goal,
                  steps,
                  savedAt: Date.now(),
                };
                await saveRecipe(recipe);
                setSaveNameVisible(false);
                Alert.alert('נשמר', `"${recipe.name}" נשמרה לתוכניות שלך.`);
              }
            }}
          >
            <Text style={styles.saveNameConfirmText}>שמור</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSaveNameVisible(false)}
            style={styles.saveNameCancel}
          >
            <Text style={styles.saveNameCancelText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {steps.length} שלבים ·{' '}
          <Text style={{ color: Colors.orange }}>
            {totalMin > 0 ? `${totalMin}ד ` : ''}
            {totalSec > 0 ? `${totalSec}ש` : ''}
            {totalSeconds === 0 ? 'ידני' : ''}
          </Text>{' '}
          סה"כ
        </Text>
      </View>

      <FlatList
        data={steps}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderStep}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startButtonText}>התחל סשן</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    minWidth: 70,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryText: {
    ...Typography.label,
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  stepIndexText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stirBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stirBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stepInstruction: {
    ...Typography.instruction,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  stepControls: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  controlBlock: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  controlLabel: {
    ...Typography.label,
    fontSize: 9,
    marginBottom: Spacing.xs,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  adjBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnText: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontWeight: '600',
  },
  controlValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startButton: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.md,
    height: ButtonSize.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: Colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
    minWidth: 100,
    justifyContent: 'flex-end',
  },
  saveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.orange,
    letterSpacing: 0.5,
  },
  saveNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  saveNameInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'right',
  },
  saveNameConfirm: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.orange,
    borderRadius: Radius.sm,
  },
  saveNameConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  saveNameCancel: {
    padding: Spacing.sm,
  },
  saveNameCancelText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
