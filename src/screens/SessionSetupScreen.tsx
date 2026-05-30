import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, SessionGoal, StrainProfile, SavedRecipe } from '../types';
import { STRAINS } from '../data/strains';
import { Colors, Typography, Spacing, Radius, ButtonSize } from '../theme';
import { loadRecipes, deleteRecipe } from '../services/storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SessionSetup'>;
};

const GOAL_OPTIONS: { key: SessionGoal; label: string; description: string }[] = [
  {
    key: 'WORK_MODE',
    label: 'WORK MODE',
    description: 'Caps at 195°C — clear-headed, functional high',
  },
  {
    key: 'NIGHT_MODE',
    label: 'NIGHT MODE',
    description: `Full extraction up to 210°C — deep sedative effect`,
  },
];

export default function SessionSetupScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [selectedStrain, setSelectedStrain] = useState<StrainProfile | null>(null);
  const [goal, setGoal] = useState<SessionGoal>('WORK_MODE');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [savedExpanded, setSavedExpanded] = useState(false);

  // Reload saved recipes every time this screen comes into focus (e.g. after saving in RoutineEditor)
  useFocusEffect(
    useCallback(() => {
      loadRecipes().then(setSavedRecipes);
    }, [])
  );

  const filteredStrains = useMemo(() => {
    if (!query.trim()) return STRAINS;
    const q = query.toLowerCase();
    return STRAINS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.grower?.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelectStrain = (strain: StrainProfile) => {
    setSelectedStrain(strain);
    setQuery(strain.grower ? `${strain.name} (${strain.grower})` : strain.name);
    setDropdownOpen(false);
  };

  const handleGenerate = () => {
    if (!selectedStrain) return;
    navigation.navigate('RoutineEditor', {
      strainId: selectedStrain.id,
      goal,
    });
  };

  const typeColor = (type: StrainProfile['type']) => {
    if (type === 'sativa') return Colors.orange;
    if (type === 'indica') return Colors.blue;
    return Colors.success;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.logo}>VAPOR</Text>
        <Text style={[styles.logo, { color: Colors.orange }]}>TIME</Text>
      </View>

      <View style={styles.content}>
        {/* Strain Search */}
        <Text style={styles.label}>STRAIN</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setDropdownOpen(true);
              if (!t) setSelectedStrain(null);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search strain..."
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setSelectedStrain(null);
                setDropdownOpen(false);
              }}
              style={styles.clearBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {dropdownOpen && filteredStrains.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredStrains}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedStrain?.id === item.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleSelectStrain(item)}
                >
                  <View style={styles.dropdownItemLeft}>
                    <Text style={styles.dropdownItemName}>
                      {item.name}
                      {item.grower ? (
                        <Text style={styles.dropdownItemGrower}> · {item.grower}</Text>
                      ) : null}
                    </Text>
                    <View style={styles.tagRow}>
                      <View style={[styles.typeTag, { borderColor: typeColor(item.type) }]}>
                        <Text style={[styles.typeTagText, { color: typeColor(item.type) }]}>
                          {item.type.toUpperCase()}
                        </Text>
                      </View>
                      {item.characteristics.map((c) => (
                        <View key={c} style={styles.charTag}>
                          <Text style={styles.charTagText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.tempBadge}>{item.default_max_temp}°C</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Goal Selector */}
        <Text style={[styles.label, { marginTop: Spacing.xl }]}>SESSION GOAL</Text>
        <View style={styles.goalRow}>
          {GOAL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.goalCard,
                goal === opt.key && {
                  borderColor: opt.key === 'WORK_MODE' ? Colors.orange : Colors.blue,
                  backgroundColor:
                    opt.key === 'WORK_MODE' ? `${Colors.orange}18` : `${Colors.blue}18`,
                },
              ]}
              onPress={() => setGoal(opt.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.goalLabel,
                  goal === opt.key && {
                    color: opt.key === 'WORK_MODE' ? Colors.orange : Colors.blue,
                  },
                ]}
              >
                {opt.label}
              </Text>
              <Text style={styles.goalDesc}>{opt.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Saved Routines */}
        {savedRecipes.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <TouchableOpacity
              style={styles.savedHeader}
              onPress={() => setSavedExpanded((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={styles.label}>SAVED ROUTINES ({savedRecipes.length})</Text>
              <Text style={styles.savedChevron}>{savedExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {savedExpanded &&
              savedRecipes.map((recipe) => (
                <View key={recipe.id} style={styles.savedRow}>
                  <TouchableOpacity
                    style={styles.savedRowMain}
                    onPress={() =>
                      navigation.navigate('ActiveSession', {
                        steps: JSON.stringify(recipe.steps),
                        strainName: recipe.name,
                        goal: recipe.goal,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.savedRowName}>{recipe.name}</Text>
                    <Text
                      style={[
                        styles.savedRowGoal,
                        { color: recipe.goal === 'WORK_MODE' ? Colors.orange : Colors.blue },
                      ]}
                    >
                      {recipe.goal === 'WORK_MODE' ? 'WORK' : 'NIGHT'} · {recipe.steps.length} STEPS
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.savedDeleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() =>
                      Alert.alert('Delete Routine', `Delete "${recipe.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteRecipe(recipe.id);
                            setSavedRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
                          },
                        },
                      ])
                    }
                  >
                    <Text style={styles.savedDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, !selectedStrain && styles.ctaButtonDisabled]}
          onPress={handleGenerate}
          disabled={!selectedStrain}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>GENERATE ROUTINE</Text>
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
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 6,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  clearBtn: {
    padding: Spacing.md,
  },
  clearBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  dropdown: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    maxHeight: 280,
    overflow: 'hidden',
  },
  dropdownList: {
    borderRadius: Radius.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: `${Colors.orange}15`,
  },
  dropdownItemLeft: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dropdownItemGrower: {
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  charTag: {
    backgroundColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  charTagText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tempBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.orange,
    marginLeft: Spacing.sm,
  },
  goalRow: {
    gap: Spacing.md,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: ButtonSize.secondary,
    justifyContent: 'center',
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  goalDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  ctaButton: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.md,
    height: ButtonSize.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: Colors.border,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  savedChevron: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  savedRowMain: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  savedRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  savedRowGoal: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  savedDeleteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  savedDeleteText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
