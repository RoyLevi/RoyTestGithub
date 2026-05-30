import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

export const BACKGROUND_TIMER_TASK = 'VAPORTIME_BACKGROUND_TIMER';

// Configure notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vaportime-session', {
      name: 'Session Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

export async function scheduleStepEndNotification(
  stepName: string,
  nextInstruction: string,
  nextTemp: number,
  delaySeconds: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Step Complete — ${stepName}`,
      body: nextInstruction || `Set device to ${nextTemp}°C`,
      sound: 'default',
      data: { type: 'STEP_END', nextTemp },
      ...(Platform.OS === 'android' && { channelId: 'vaportime-session' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(delaySeconds)),
    },
  });
  return id;
}

export async function scheduleStirNotification(delaySeconds: number): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'הגיע הזמן לערבב!',
      body: 'פתח את יחידת הקירור, ערבב בעדינות, ולחץ המשך בסיום.',
      sound: 'default',
      data: { type: 'STIR' },
      ...(Platform.OS === 'android' && { channelId: 'vaportime-session' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(delaySeconds)),
    },
  });
  return id;
}

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllSessionNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Register background task for resync on app wake
TaskManager.defineTask(BACKGROUND_TIMER_TASK, async () => {
  // The heavy lifting is done via timestamps — this task just keeps
  // the process alive long enough for the OS to deliver local notifications.
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TIMER_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TIMER_TASK, {
        minimumInterval: 60, // iOS minimum is 1 minute
        stopOnTerminate: false,
        startOnBoot: false,
      });
    }
  } catch {
    // Background fetch not available in Expo Go; silently continue
  }
}
