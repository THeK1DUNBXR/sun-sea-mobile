import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type Tone = 'success' | 'info' | 'warning' | 'danger';
interface ToastState {
  show: (text: string, tone?: Tone) => void;
}
const Ctx = createContext<ToastState>({ show: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ text: string; tone: Tone } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, tone: Tone = 'success') => {
      setToast({ text, tone });
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [opacity]
  );

  const value = useMemo(() => ({ show }), [show]);
  const icon: Record<Tone, keyof typeof Ionicons.glyphMap> = { success: 'checkmark-circle', info: 'information-circle', warning: 'warning', danger: 'alert-circle' };
  const bg: Record<Tone, string> = { success: colors.success, info: colors.primary, warning: colors.warning, danger: colors.danger };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, { backgroundColor: bg[toast.tone] }]}>
            <Ionicons name={icon[toast.tone]} size={18} color="#fff" />
            <Text style={styles.text}>{toast.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.pill, maxWidth: '90%' },
  text: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
