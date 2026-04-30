// Mixd Logo components for React Native
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../lib/theme';

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 32 }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Rect x="14" y="50" width="92" height="20" rx={2} transform="rotate(34 60 60)" fill="#FF2D87" />
      <Rect x="14" y="50" width="92" height="20" rx={2} transform="rotate(-34 60 60)" fill="#FAFAFC" />
    </Svg>
  );
}

interface WordmarkProps {
  size?: number;
  color?: string;
}

export function Wordmark({ size = 22, color = colors.pearl }: WordmarkProps) {
  return (
    <Text style={[styles.wordmark, { fontSize: size, color }]}>
      Mi<Text style={{ color: colors.pink }}>x</Text>d
    </Text>
  );
}

interface LockupProps {
  markSize?: number;
  wordSize?: number;
}

export function Lockup({ markSize = 28, wordSize = 20 }: LockupProps) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
