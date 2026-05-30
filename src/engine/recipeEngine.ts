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
    uiInstruction: 'Start checking for flavors. Draw slowly and deeply.',
    audioPrompt: 'Start session at 170 degrees.',
    requiresUserConfirmation: false,
    triggerAction: 'STEP_UP',
  });

  // Step 2: Cannabinoid Density
  recipe.push({
    stepIndex: 2,
    stepName: 'Cannabinoid Extraction',
    targetTemp: 185,
    durationSeconds: 240,
    uiInstruction: 'Clouds should form now. Vaporize smoothly.',
    audioPrompt: 'Step up to 185 degrees.',
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
      uiInstruction:
        'Open the cooling unit. Stir the chamber gently to break up oily clusters.',
      audioPrompt: 'Time to stir your chamber.',
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
      uiInstruction:
        'Extracting remaining heavy cannabinoids (CBN). Expect harsh, sedative vapor.',
      audioPrompt: `Final step, raise to ${Math.min(strain.default_max_temp, 210)} degrees.`,
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
      uiInstruction:
        'Finishing daytime session. Stop when vapor thins out to prevent lethargy.',
      audioPrompt: 'Final step, cap at 195 degrees.',
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
