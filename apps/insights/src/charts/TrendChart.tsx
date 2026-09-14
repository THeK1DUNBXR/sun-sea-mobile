import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { TrendPoint } from '@/types';
import { formatMoneyCompact, formatShortDate } from '@/utils/format';
import { spacing, usePalette } from '@/ui/theme';

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
}

function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export function TrendChart({ data, height = 200 }: TrendChartProps) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const padding = { top: 16, bottom: 24, left: 8, right: 8 };

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

    return { salesPath, collectionsPath, areaPath, salesPoints, collectionsPoints, innerH };
  }, [data, width, height]);

  const active = activeIndex !== null ? data[activeIndex] : null;

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
      >
        {width > 0 && chart ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={palette.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={palette.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Line
              x1={0}
              y1={padding.top + chart.innerH}
              x2={width}
              y2={padding.top + chart.innerH}
              stroke={palette.border}
              strokeWidth={1}
            />
            <Path d={chart.areaPath} fill="url(#salesFill)" />
            <Path d={chart.salesPath} fill="none" stroke={palette.accent} strokeWidth={2.5} />
            <Path
              d={chart.collectionsPath}
              fill="none"
              stroke={palette.good}
              strokeWidth={2.5}
              strokeDasharray="1,0"
            />
            {activeIndex !== null && chart.salesPoints[activeIndex] ? (
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
                <Circle
                  cx={chart.salesPoints[activeIndex].x}
                  cy={chart.salesPoints[activeIndex].y}
                  r={4}
                  fill={palette.accent}
                />
                <Circle
                  cx={chart.collectionsPoints[activeIndex].x}
                  cy={chart.collectionsPoints[activeIndex].y}
                  r={4}
                  fill={palette.good}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>

      <View style={styles.legendRow}>
        <LegendDot color={palette.accent} label="Sales" />
        <LegendDot color={palette.good} label="Collections" />
        {data.length > 0 ? (
          <Text style={[styles.rangeLabel, { color: palette.textFaint }]}>
            {formatShortDate(data[0].date)} – {formatShortDate(data[data.length - 1].date)}
          </Text>
        ) : null}
      </View>

      {active ? (
        <View style={[styles.tooltip, { borderColor: palette.border, backgroundColor: palette.bgElevated }]}>
          <Text style={[styles.tooltipDate, { color: palette.text }]}>{formatShortDate(active.date)}</Text>
          <Text style={[styles.tooltipLine, { color: palette.accent }]}>
            Sales {formatMoneyCompact(active.sales)}
          </Text>
          <Text style={[styles.tooltipLine, { color: palette.good }]}>
            Collections {formatMoneyCompact(active.collections)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const palette = usePalette();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
  rangeLabel: { fontSize: 11, marginLeft: 'auto' },
  tooltip: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: spacing.sm,
    gap: 2,
  },
  tooltipDate: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  tooltipLine: { fontSize: 11, fontWeight: '600' },
});
