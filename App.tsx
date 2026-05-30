import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { RootStackParamList } from './src/types';
import { Colors } from './src/theme';
import { requestNotificationPermissions, registerBackgroundTask } from './src/services/notifications';
import SessionSetupScreen from './src/screens/SessionSetupScreen';
import RoutineEditorScreen from './src/screens/RoutineEditorScreen';
import ActiveSessionScreen from './src/screens/ActiveSessionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.orange,
    primary: Colors.orange,
  },
};

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
    registerBackgroundTask();
  }, []);

  return (
    <NavigationContainer theme={NavTheme}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack.Navigator
        initialRouteName="SessionSetup"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="SessionSetup" component={SessionSetupScreen} />
        <Stack.Screen name="RoutineEditor" component={RoutineEditorScreen} />
        <Stack.Screen
          name="ActiveSession"
          component={ActiveSessionScreen}
          options={{ gestureEnabled: false }} // prevent accidental swipe-back during session
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
