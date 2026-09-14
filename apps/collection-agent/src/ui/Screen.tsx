import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, layout, spacing } from './theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Wrap content in a KeyboardAvoidingView — set on screens with text
   * inputs near the bottom of the screen so the keyboard never covers them. */
  avoidKeyboard?: boolean;
  /** A sticky action bar pinned to the bottom of the screen, outside the
   * scrollable area, cleared of the home indicator / gesture bar. Use for a
   * screen's primary action(s) (e.g. "Record Collection") instead of
   * letting them scroll away with the content. */
  footer?: React.ReactNode;
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
  padded = true,
  avoidKeyboard = false,
  footer,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = padded ? <View style={styles.padded}>{children}</View> : children;
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, Boolean(footer) && styles.scrollContentWithFooter]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{content}</View>
  );

  const mainArea = (
    <View style={styles.flex}>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, layout.actionBarPadding) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          {mainArea}
        </KeyboardAvoidingView>
      ) : (
        mainArea
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: layout.scrollEndPad },
  scrollContentWithFooter: { paddingBottom: spacing.sm },
  padded: { flexGrow: 1, padding: layout.screenGutter, gap: layout.sectionGap },
  footer: {
    paddingHorizontal: layout.screenGutter,
    paddingTop: layout.actionBarPadding,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...elevation.raised,
  },
});
