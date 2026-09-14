import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { TrendPoint } from '@/types';
import { formatMoneyCompact, formatShortDate } from '@/utils/format';
import { radius, sizes, spacing, tabularNums, typography, useReducedMotion, usePalette } from '@/ui/theme';

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
}

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedPath = Reanimated.createAnimatedComponent(Path);
// A dash length comfortably longer than any realistic chart line, so the
// stroke-dashoffset trick reveals the whole path regardless of measured width.
const DASH_LENGTH = 4000;

function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function TrendChart({ data, height = 216 }: TrendChartProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const padding = { top: 20, bottom: 26, left: 8, right: 8 };

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
  const pulseProps = useAnimatedProps(() => ({
    r: interpolate(pulse.value, [0, 1], [6, 15]),
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));

  // The line-draw progress (0 -> 1) that reveals the sales/collections strokes and
  // fades the area fill in, plus a slightly-delayed "settle" for the latest-point
  // rings. Re-triggers once whenever the plotted series itself changes (e.g. a new
  // date range), not on every same-range refetch.
  const draw = useSharedValue(reducedMotion ? 1 : 0);
  const settle = useSharedValue(reducedMotion ? 1 : 0);
  const seriesKey = data.length > 0 ? `${data.length}:${data[0]?.date}:${data[data.length - 1]?.date}` : '';
  const prevSeriesKey = useRef<string | null>(null);

  useEffect(() => {
    if (!seriesKey) return;
    if (reducedMotion) {
      draw.value = 1;
      settle.value = 1;
      prevSeriesKey.current = seriesKey;
      return;
    }
    if (prevSeriesKey.current !== seriesKey) {
      const easing = Easing.out(Easing.cubic);
      draw.value = 0;
      draw.value = withTiming(1, { duration: 700, easing });
      settle.value = 0;
      settle.value = withDelay(500, withTiming(1, { duration: 260, easing }));
      prevSeriesKey.current = seriesKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, reducedMotion]);

  const salesLineProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - draw.value) * DASH_LENGTH,
  }));
  const collectionsLineProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - draw.value) * DASH_LENGTH,
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: draw.value }));
  const salesSettleProps = useAnimatedProps(() => ({ r: interpolate(settle.value, [0, 1], [0, 5.5]) }));
  const collectionsSettleProps = useAnimatedProps(() => ({ r: interpolate(settle.value, [0, 1], [0, 4.5]) }));

  const chart = useMemo(() => {
    if (width === 0 || data.length === 0) return null;
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const values = data.flatMap((d) => [d.sales ?? 0, d.collections ?? 0]);
    const maxValue = Math.max(...values, 1);
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const toPoints = (key: 'sales' | 'collections') =>
      data.map((d, i) => ({
        x: padding.left + i * stepX,
        y: padding.top + innerH - ((d[key] ?? 0) / maxValue) * innerH,
      }));

    const salesPoints = toPoints('sales');
    const collectionsPoints = toPoints('collections');
    const salesPath = buildLinePath(salesPoints);
    const collectionsPath = buildLinePath(collectionsPoints);
    const areaPath =
      salesPoints.length > 0
        ? `${salesPath} L${salesPoints[salesPoints.length - 1].x},${padding.top + innerH} L${salesPoints[0].x},${padding.top + innerH} Z`
        : '';

    return { salesPath, collectionsPath, areaPath, salesPoints, collectionsPoints, innerH, maxValue };
  }, [data, width, height]);

  const active = activeIndex !== null ? data[activeIndex] : null;
  const latestIndex = data.length - 1;
  const latest = data[latestIndex];

  const a11yLabel =
    data.length > 0
      ? `Sales versus collections trend, ${formatShortDate(data[0].date)} to ${formatShortDate(data[latestIndex].date)}. Latest: sales ${formatMoneyCompact(latest?.sales)}, collections ${formatMoneyCompact(latest?.collections)}.`
      : 'Sales versus collections trend, no data yet.';

  return (
    <View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderMove={(e) => {
          if (!chart || data.length === 0) return;
          const x = e.nativeEvent.locationX;
          const stepX = chart.salesPoints.length > 1
            ? (chart.salesPoints[chart.salesPoints.length - 1].x - chart.salesPoints[0].x) / (chart.salesPoints.length - 1)
            : 1;
          const idx = Math.round((x - padding.left) / (stepX || 1));
          setActiveIndex(Math.max(0, Math.min(data.length - 1, idx)));
        }}
        onResponderRelease={() => setActiveIndex(null)}
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
      >
        {width > 0 && chart ? (
          <>
            <Text style={[typography.caption, tabularNums, styles.axisLabel, styles.axisLabelTop, { color: palette.textFaint }]}>
              {formatMoneyCompact(chart.maxValue)}
            </Text>
            <Text style={[typography.caption, tabularNums, styles.axisLabel, styles.axisLabelBottom, { color: palette.textFaint }]}>₹0</Text>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={palette.accent} stopOpacity={0.25} />
                  <Stop offset="1" stopColor={palette.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {/* Whisper-quiet gridlines: baseline + one midline */}
              <Line
                x1={0}
                y1={padding.top}
                x2={width}
                y2={padding.top}
                stroke={palette.border}
                strokeWidth={1}
                strokeDasharray="1,4"
              />
              <Line
                x1={0}
                y1={padding.top + chart.innerH / 2}
                x2={width}
                y2={padding.top + chart.innerH / 2}
                stroke={palette.border}
                strokeWidth={1}
                strokeDasharray="1,4"
              />
              <Line
                x1={0}
                y1={padding.top + chart.innerH}
                x2={width}
                y2={padding.top + chart.innerH}
                stroke={palette.border}
                strokeWidth={1}
              />
              <AnimatedPath d={chart.areaPath} fill="url(#salesFill)" animatedProps={areaProps} />
              <AnimatedPath
                d={chart.collectionsPath}
                fill="none"
                stroke={palette.good}
                strokeWidth={2.5}
                strokeDasharray={[DASH_LENGTH, DASH_LENGTH]}
                animatedProps={collectionsLineProps}
              />
              <AnimatedPath
                d={chart.salesPath}
                fill="none"
                stroke={palette.accent}
                strokeWidth={2.75}
                strokeDasharray={[DASH_LENGTH, DASH_LENGTH]}
                animatedProps={salesLineProps}
              />

              {/* Highlighted latest point: settles into place after the line draws in, plus a quiet ongoing pulse. */}
              {chart.salesPoints[latestIndex] ? (
                <>
                  {!reducedMotion ? (
                    <AnimatedCircle
                      cx={chart.salesPoints[latestIndex].x}
                      cy={chart.salesPoints[latestIndex].y}
                      fill={palette.accent}
                      animatedProps={pulseProps}
                    />
                  ) : null}
                  <AnimatedCircle
                    cx={chart.salesPoints[latestIndex].x}
                    cy={chart.salesPoints[latestIndex].y}
                    fill={palette.bgElevated}
                    stroke={palette.accent}
                    strokeWidth={2.5}
                    animatedProps={salesSettleProps}
                  />
                  <AnimatedCircle
                    cx={chart.collectionsPoints[latestIndex].x}
                    cy={chart.collectionsPoints[latestIndex].y}
                    fill={palette.bgElevated}
                    stroke={palette.good}
                    strokeWidth={2.25}
                    animatedProps={collectionsSettleProps}
                  />
                </>
              ) : null}

              {activeIndex !== null && activeIndex !== latestIndex && chart.salesPoints[activeIndex] ? (
                <>
                  <Line
                    x1={chart.salesPoints[activeIndex].x}
                    y1={padding.top}
                    x2={chart.salesPoints[activeIndex].x}
                    y2={padding.top + chart.innerH}
                    stroke={palette.textFaint}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                  <Circle cx={chart.salesPoints[activeIndex].x} cy={chart.salesPoints[activeIndex].y} r={4} fill={palette.accent} />
                  <Circle cx={chart.collectionsPoints[activeIndex].x} cy={chart.collectionsPoints[activeIndex].y} r={4} fill={palette.good} />
                </>
              ) : null}
            </Svg>
          </>
        ) : null}
      </View>

      <View style={styles.legendRow}>
        <LegendChip color={palette.accent} label="Sales" value={formatMoneyCompact(latest?.sales)} />
        <LegendChip color={palette.good} label="Collections" value={formatMoneyCompact(latest?.collections)} />
      </View>
      {data.length > 0 ? (
        <Text style={[typography.caption, { color: palette.textFaint, marginTop: spacing.xs }]}>
          {formatShortDate(data[0].date)} – {formatShortDate(data[latestIndex].date)}
        </Text>
      ) : null}

      {active ? (
        <View style={[styles.tooltip, { borderColor: palette.border, backgroundColor: palette.bgElevated }]}>
          <Text style={[typography.caption, { color: palette.text, marginBottom: 2 }]}>{formatShortDate(active.date)}</Text>
          <Text style={[typography.monoSm, { color: palette.accent }]}>
            Sales {formatMoneyCompact(active.sales)}
          </Text>
          <Text style={[typography.monoSm, { color: palette.good }]}>
            Collections {formatMoneyCompact(active.collections)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function LegendChip({ color, label, value }: { color: string; label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.chip, { backgroundColor: palette.overlay }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typography.caption, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[typography.monoSm, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axisLabel: {
    position: 'absolute',
    left: 0,
  },
  axisLabelTop: { top: 0 },
  axisLabelBottom: { bottom: 6 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: sizes.chipPaddingH,
    paddingVertical: sizes.chipPaddingV,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tooltip: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: spacing.sm,
    gap: 2,
  },
});
