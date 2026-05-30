import { SessionStep, StrainProfile, SessionGoal } from '../types';

export function generateRecipe(strain: StrainProfile, mode: SessionGoal): SessionStep[] {
  const recipe: SessionStep[] = [];

  // Step 1: Terpene / Flavor Bloom
  // Dry strains reach temp faster, so shorter bloom is sufficient
  recipe.push({
    stepIndex: 1,
    stepName: 'Flavor Bloom',
    targetTemp: 170,
    durationSeconds: strain.characteristics.includes('dry') ? 180 : 240,
    uiInstruction: 'התחל לבדוק טעמים. שאף לאט ועמוק.',
    audioPrompt: 'קדימה, התחל ב-170 מעלות. שאף לאט ועמוק.',
    requiresUserConfirmation: false,
    triggerAction: 'STEP_UP',
  });

  // Step 2: Cannabinoid Density
  recipe.push({
    stepIndex: 2,
    stepName: 'Cannabinoid Extraction',
    targetTemp: 185,
    durationSeconds: 240,
    uiInstruction: 'האדים אמורים להיווצר עכשיו. שאף בצורה חלקה.',
    audioPrompt: 'הגיע הזמן — העלה ל-185 מעלות.',
    requiresUserConfirmation: false,
    triggerAction: 'STEP_UP',
  });

  // Step 3: Stirring Phase — required for resinous/oily strains to prevent hot-spots
  if (
    strain.characteristics.includes('resinous') ||
    strain.characteristics.includes('oily')
  ) {
    recipe.push({
      stepIndex: recipe.length + 1,
      stepName: 'Stir Break',
      targetTemp: 185,
      durationSeconds: 0, // Clock paused until confirmation
      uiInstruction: 'פתח את יחידת הקירור. ערבב את החדר בעדינות לפירוק צבירים שמניים.',
      audioPrompt: 'הגיע הזמן לערבב. פתח, ערבב בעדינות, ולחץ המשך בסיום.',
      requiresUserConfirmation: true,
      triggerAction: 'STIR',
    });
  }

  // Step 4: Finalization based on user goal
  if (mode === 'NIGHT_MODE') {
    recipe.push({
      stepIndex: recipe.length + 1,
      stepName: 'Complete Extraction',
      targetTemp: Math.min(strain.default_max_temp, 210),
      durationSeconds: 120,
      uiInstruction: 'חילוץ קנבינואידים כבדים (CBN). צפה לאדים חזקים ומרדימים.',
      audioPrompt: `שלב אחרון — העלה ל-${Math.min(strain.default_max_temp, 210)} מעלות.`,
      requiresUserConfirmation: false,
      triggerAction: 'FINISH',
    });
  } else {
    // WORK_MODE — hard cap at 195°C to avoid CBN release and couch-lock
    recipe.push({
      stepIndex: recipe.length + 1,
      stepName: 'Clean Daytime Finish',
      targetTemp: 195,
      durationSeconds: 120,
      uiInstruction: 'סיום סשן יומי. עצור כשהאד מדלדל כדי למנוע עייפות.',
      audioPrompt: 'שלב אחרון — העלה ל-195 מעלות.',
      requiresUserConfirmation: false,
      triggerAction: 'FINISH',
    });
  }

  return recipe;
}

export function totalSessionDurationSeconds(steps: SessionStep[]): number {
  return steps.reduce((sum, s) => sum + s.durationSeconds, 0);
}

export function completedDurationSeconds(
  steps: SessionStep[],
  currentStepIndex: number,
  currentStepElapsed: number
): number {
  const pastSteps = steps
    .slice(0, currentStepIndex)
    .reduce((sum, s) => sum + s.durationSeconds, 0);
  return pastSteps + currentStepElapsed;
}
