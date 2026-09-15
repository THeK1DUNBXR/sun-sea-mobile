import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from '@/api/agentApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Requests permission, gets an Expo push token, and registers it with the backend. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens require a physical device

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenResponse.data;

    await registerPushToken({
      pushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? undefined,
      appName: 'SunSea Collect',
    }).catch(() => {
      // Non-fatal — the token can be re-registered on next app start.
    });

    return pushToken;
  } catch {
    return null;
  }
}

/** Subscribes to notification taps; caller decides where "open assignments" navigates. */
export function subscribeNotificationTaps(onOpenAssignments: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => {
    onOpenAssignments();
  });
  return () => sub.remove();
}
