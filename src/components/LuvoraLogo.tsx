import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Palette } from '../constants/theme';

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
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: size, height: Math.round(size * 0.82) }}
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
    fontSize: 34,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.8,
    ...Platform.select({
      ios: {
        fontFamily: 'Georgia',
      },
      android: {
        fontFamily: 'serif',
      },
      default: {
        fontFamily: 'serif',
      },
    }),
  },
});

