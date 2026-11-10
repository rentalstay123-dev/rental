import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Palette, Typography } from '../constants/theme';

interface PropertyStatusDonutProps {
  total?: number;
  occupied?: number;
  vacant?: number;
}

export default function PropertyStatusDonut({
  total = 4,
  occupied = 3,
  vacant = 1,
}: PropertyStatusDonutProps) {
  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages
  const occupiedRatio = total > 0 ? occupied / total : 0.75;
  const vacantRatio = total > 0 ? vacant / total : 0.25;

  const occupiedStroke = circumference * occupiedRatio;
  const vacantStroke = circumference * vacantRatio;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Vacant Segment (Soft Beige) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Palette.border}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${vacantStroke} ${circumference}`}
            strokeDashoffset={-occupiedStroke}
            strokeLinecap="round"
          />
          {/* Occupied Segment (Primary Brand Indigo) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Palette.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${occupiedStroke} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center Label */}
      <View style={styles.centerTextContainer}>
        <Text style={styles.centerNumber}>{total}</Text>
        <Text style={styles.centerLabel}>Properties</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Palette.text,
    lineHeight: 28,
  },
  centerLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
});
