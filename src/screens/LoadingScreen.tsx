import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LuvoraLogo from '../components/LuvoraLogo';
import { Palette } from '../constants/theme';

interface LoadingScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function LoadingScreen({ onFinish, duration = 2400 }: LoadingScreenProps) {
  // Animation values
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.92));
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    // 1. Logo Fade-in and gentle scale up
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous subtle pulsing for "Loading..." text
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();

    // 3. Progress bar animation from 0% to 100%
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start(() => {
      pulseAnim.stop();
      if (onFinish) {
        onFinish();
      }
    });
  }, [duration, onFinish, logoOpacity, logoScale, progressAnim, textOpacity]);

  // Interpolate progress width from 0 to 180 (the total bar width)
  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Centered Brand & Animation Area */}
      <Animated.View
        style={[
          styles.centerArea,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Luvora House Emblem & Wordmark */}
        <LuvoraLogo size={140} />

        {/* Progress Bar Container */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: barWidth,
              },
            ]}
          />
        </View>

        {/* Pulsing "Loading..." Subtext */}
        <Animated.Text style={[styles.loadingText, { opacity: textOpacity }]}>
          Loading...
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  progressBarTrack: {
    width: 180,
    height: 5,
    backgroundColor: Palette.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    letterSpacing: 2,
    fontWeight: '500',
  },
});

