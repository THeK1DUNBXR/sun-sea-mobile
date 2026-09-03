import * as Haptics from 'expo-haptics';

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
export const warn = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
export const error = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
