import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, radius, spacing, type } from './theme';
import { useReducedMotion } from './useReducedMotion';
import type { Tone } from './format';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Small filled dot ahead of the label — the consistent way this app marks
   * status everywhere (never a left-edge border stripe). */
  dot?: boolean;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  // Genuinely neutral (not brand-tinted): "nothing to report yet" shouldn't
  // borrow the brand hue, which stays reserved for identity and actions.
  default: { bg: colors.neutralTint, fg: colors.neutral },
  success: { bg: colors.successTint, fg: colors.success },
  warning: { bg: colors.warningTint, fg: colors.warning },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  info: { bg: colors.infoTint, fg: colors.info },
};

export function Badge({ label, tone = 'default', dot = false }: BadgeProps) {
  const t = toneColors[tone];
  const reduceMotion = useReducedMotion();
  // Keyed on label+tone so a status change (e.g. Pending -> Collected)
  // remounts this inner view and cross-fades instead of snapping.
  return (
    <View accessibilityRole="text">
      <Animated.View
        key={`${label}-${tone}`}
        entering={reduceMotion ? undefined : FadeIn.duration(180)}
        exiting={reduceMotion ? undefined : FadeOut.duration(120)}
        style={[styles.badge, { backgroundColor: t.bg }]}
      >
        {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
        {/* No numberOfLines cap: at large Android font scale / Dynamic Type
            this wraps to a second line inside the pill instead of clipping
            or ellipsizing status text away. */}
        <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + spacing.xxs,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  dot: { width: spacing.xs + spacing.xxs, height: spacing.xs + spacing.xxs, borderRadius: (spacing.xs + spacing.xxs) / 2 },
  text: {
    ...type.label,
    textTransform: 'uppercase',
  },
});
