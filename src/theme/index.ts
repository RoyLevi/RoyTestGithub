export const Colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#252525',
  border: '#2E2E2E',

  // Primary accents
  orange: '#FF6B35',
  orangeDim: '#CC5528',
  blue: '#00D4FF',
  blueDim: '#0096B3',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',

  // Semantic
  success: '#00E676',
  warning: '#FFD740',
  error: '#FF5252',

  // Step-specific
  heating: '#FF6B35',
  cooling: '#00D4FF',
  stir: '#FFD740',
  complete: '#00E676',
};

export const Typography = {
  // Massive countdown display
  countdown: {
    fontSize: 88,
    fontWeight: '800' as const,
    letterSpacing: -2,
    color: Colors.textPrimary,
  },
  // Large temperature display
  temperature: {
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: Colors.orange,
  },
  // Step name
  stepName: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  // Body instruction text
  instruction: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  // Section labels
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: Colors.textMuted,
  },
  // Button text
  button: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};

export const ButtonSize = {
  // Minimum accessible touch targets
  primary: 60,
  secondary: 52,
  icon: 56,
};
