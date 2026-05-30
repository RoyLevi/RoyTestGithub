export type StrainType = 'sativa' | 'indica' | 'hybrid';

export type StrainCharacteristic =
  | 'dry'
  | 'terpene-rich'
  | 'resinous'
  | 'oily'
  | 'heavy'
  | 'light'
  | 'citrus'
  | 'earthy';

export interface StrainProfile {
  id: string;
  name: string;
  grower?: string;
  type: StrainType;
  characteristics: StrainCharacteristic[];
  default_max_temp: number;
}

export type SessionGoal = 'WORK_MODE' | 'NIGHT_MODE';

export type TriggerAction = 'STIR' | 'STEP_UP' | 'FINISH';

export interface SessionStep {
  stepIndex: number;
  stepName: string;
  targetTemp: number;
  durationSeconds: number;
  uiInstruction: string;
  audioPrompt: string;
  requiresUserConfirmation: boolean;
  triggerAction?: TriggerAction;
}

export interface SavedRecipe {
  id: string;
  name: string;
  strainId: string;
  goal: SessionGoal;
  steps: SessionStep[];
  savedAt: number;
}

export type RootStackParamList = {
  SessionSetup: undefined;
  RoutineEditor: {
    strainId?: string;
    strainName?: string;          // display name for custom/AI-generated strains
    goal: SessionGoal;
    preGeneratedSteps?: string;   // JSON SessionStep[] from AI
  };
  ActiveSession: {
    steps: string; // JSON-serialized SessionStep[]
    strainName: string;
    goal: SessionGoal;
  };
};
