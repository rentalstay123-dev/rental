import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Palette, Typography } from '../constants/theme';

interface LuvoraLogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export default function LuvoraLogo({
  size = 110,
  showText = true,
  textColor = Palette.text,
}: LuvoraLogoProps) {
  const iconSize = Math.round(size * 0.86);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo-squircle.png')}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.brandTitle, { color: textColor }]}>
          Luvora
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: Typography.fontSize.hero,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.8,
    fontFamily: Typography.fontFamily.serif,
  },
});

