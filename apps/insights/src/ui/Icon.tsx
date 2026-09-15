import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'overview'
  | 'agents'
  | 'activity'
  | 'settings'
  | 'invoice'
  | 'collection'
  | 'deposit'
  | 'logout'
  | 'check'
  | 'dash';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * A small, hand-authored icon set in one consistent stroke and weight — used
 * everywhere an emoji or a bare Unicode glyph would otherwise stand in for one
 * (tab bar, activity feed, settings). No icon font, no external assets.
 */
export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  switch (name) {
    case 'overview':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3.5} y={13} width={4} height={7.5} rx={1} {...common} />
          <Rect x={10} y={8.5} width={4} height={12} rx={1} {...common} />
          <Rect x={16.5} y={4} width={4} height={16.5} rx={1} {...common} />
        </Svg>
      );
    case 'agents':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 21c4.2-4.1 6.5-7.4 6.5-10.2A6.5 6.5 0 1 0 5.5 10.8C5.5 13.6 7.8 16.9 12 21z" {...common} />
          <Circle cx={12} cy={10.5} r={2.2} {...common} />
        </Svg>
      );
    case 'activity':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 12h3.2l2-6 4.4 12.5L15 9l1.6 3H21" {...common} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3.1} {...common} />
          <Path
            d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3"
            {...common}
          />
        </Svg>
      );
    case 'invoice':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6.5 3.5h8l3 3v13.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z" {...common} />
          <Line x1={8.5} y1={9.5} x2={15.5} y2={9.5} {...common} />
          <Line x1={8.5} y1={13} x2={15.5} y2={13} {...common} />
          <Line x1={8.5} y1={16.5} x2={12.5} y2={16.5} {...common} />
        </Svg>
      );
    case 'collection':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Path d="M14.5 9.3a2.6 2.6 0 0 0-2.4-1.4c-1.6 0-2.7 1-2.7 2.2 0 3 5.2 1.4 5.2 4.3 0 1.3-1.2 2.2-2.7 2.2a2.9 2.9 0 0 1-2.6-1.4M12 6.8v1.1M12 16.1v1.1" {...common} />
        </Svg>
      );
    case 'deposit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3.5 9.5 12 4l8.5 5.5" {...common} />
          <Line x1={4.5} y1={9.5} x2={19.5} y2={9.5} {...common} />
          <Line x1={6} y1={11.5} x2={6} y2={18} {...common} />
          <Line x1={10.5} y1={11.5} x2={10.5} y2={18} {...common} />
          <Line x1={13.5} y1={11.5} x2={13.5} y2={18} {...common} />
          <Line x1={18} y1={11.5} x2={18} y2={18} {...common} />
          <Line x1={4} y1={20} x2={20} y2={20} {...common} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Path d="M8.3 12.3l2.6 2.6 5-5.2" {...common} />
        </Svg>
      );
    case 'dash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Line x1={8.5} y1={12} x2={15.5} y2={12} {...common} />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M14.5 8V5.8A1.8 1.8 0 0 0 12.7 4h-6A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.7 20h6a1.8 1.8 0 0 0 1.8-1.8V16" {...common} />
          <Line x1={9.5} y1={12} x2={20} y2={12} {...common} />
          <Path d="M17 8.5 20.5 12 17 15.5" {...common} />
        </Svg>
      );
    default:
      return null;
  }
}
