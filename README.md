# VaporTime — Vape Step-Up Session Manager

A mobile app (React Native + Expo) that guides medical cannabis vaporizer users through the "Step-Up" temperature method based on strain profiles and session goals.

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your device, or press `i` for iOS simulator / `a` for Android emulator.

## Screens

1. **Session Setup** — Select a strain and goal (Work Mode / Night Mode), then generate a personalized routine.
2. **Routine Editor** — Preview and adjust each step's temperature and duration before starting.
3. **Active Session Player** — Large countdown timer, temperature display, pause/resume/skip controls, and a puff counter.

## Architecture

### Recipe Engine (`src/engine/recipeEngine.ts`)
Generates a `SessionStep[]` array from a strain profile and goal:
- **Flavor Bloom** @ 170°C
- **Cannabinoid Extraction** @ 185°C
- **Stir Break** (for resinous/oily strains) — manual pause
- **Finalization** @ 195°C (Work Mode) or up to 210°C (Night Mode)

### Background Timer (`src/hooks/useSessionTimer.ts`)
Uses **Unix timestamp anchoring** (`Date.now()`) rather than a tick counter, so the timer stays accurate when the OS throttles `setInterval` in the background. Steps' start times are stored as `effectiveStartTimestamp` (adjusted for pauses), and an `AppState` listener resyncs the display on foreground.

### Notifications (`src/services/notifications.ts`)
Local push notifications via `expo-notifications` are scheduled at step-start for exactly `durationSeconds` in the future, so the user gets alerted even with the screen locked.

### TTS (`expo-speech`)
Each step transition speaks the `audioPrompt` field over device speakers/headphones.

## Strain Data
Add strains to `src/data/strains.ts`. Key fields:
- `characteristics`: include `"resinous"` or `"oily"` to trigger a Stir Break step
- `default_max_temp`: used as the ceiling in Night Mode
