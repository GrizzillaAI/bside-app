// Mixd Mobile — Retro Cassette Deck Visual
// Animated tape reels that spin during playback, tape winding visual,
// label strip, and tape window — matches the web CassetteDeck aesthetic.
// Used in the NowPlayingScreen as an alternative to album art.

import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Line, G } from 'react-native-svg';
import { colors } from '../lib/theme';

interface CassetteDeckProps {
  isPlaying: boolean;
  progress: number; // 0–1, how far through the track
  trackTitle?: string;
}

const AnimatedG = Animated.createAnimatedComponent(G);

export default function CassetteDeck({ isPlaying, progress, trackTitle }: CassetteDeckProps) {
  const leftSpin = useRef(new Animated.Value(0)).current;
  const rightSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      // Left reel spins slower (supply reel)
      const leftAnim = Animated.loop(
        Animated.timing(leftSpin, {
          toValue: 1,
          duration: 2400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      // Right reel spins faster (take-up reel)
      const rightAnim = Animated.loop(
        Animated.timing(rightSpin, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      leftAnim.start();
      rightAnim.start();
      return () => { leftAnim.stop(); rightAnim.stop(); };
    } else {
      leftSpin.stopAnimation();
      rightSpin.stopAnimation();
    }
  }, [isPlaying, leftSpin, rightSpin]);

  const leftRotate = leftSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const rightRotate = rightSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Tape winding: left reel gets bigger as progress increases
  // right reel gets smaller
  const leftTapeRadius = 12 + progress * 8;
  const rightTapeRadius = 20 - progress * 8;

  return (
    <View style={styles.container}>
      {/* Tape well */}
      <View style={styles.tapeWell}>
        {/* Cassette body */}
        <View style={styles.cassetteBody}>
          {/* Corner screws */}
          <View style={[styles.screw, { top: 6, left: 6 }]} />
          <View style={[styles.screw, { top: 6, right: 6 }]} />
          <View style={[styles.screw, { bottom: 6, left: 6 }]} />
          <View style={[styles.screw, { bottom: 6, right: 6 }]} />

          {/* Label strip */}
          <View style={styles.labelStrip}>
            <Text style={styles.labelText}>MIXD</Text>
            <View style={styles.labelLine} />
            <Text style={styles.labelText}>Side A</Text>
            <View style={styles.labelLine} />
            <Text style={styles.labelText}>CrO₂ 90</Text>
          </View>

          {/* Tape window */}
          <View style={styles.tapeWindow}>
            {/* Ribbon */}
            <View style={styles.ribbon} />

            {/* Left reel */}
            <Animated.View style={[styles.reelContainer, styles.leftReel, { transform: [{ rotate: leftRotate }] }]}>
              <View style={[styles.tapeDisc, { width: leftTapeRadius * 2, height: leftTapeRadius * 2, borderRadius: leftTapeRadius }]} />
              <Svg width={48} height={48} viewBox="0 0 48 48" style={styles.reelSvg}>
                {/* Outer ring */}
                <Circle cx={24} cy={24} r={22} stroke="rgba(60,60,96,0.45)" strokeWidth={2} fill="none" />
                {/* Hub */}
                <Circle cx={24} cy={24} r={10} fill="url(#hubGrad)" stroke="#3E3E5E" strokeWidth={2} />
                {/* Center dot */}
                <Circle cx={24} cy={24} r={4} fill="#5E5E80" />
                {/* Spokes */}
                {[0, 60, 120, 180, 240, 300].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 24 + Math.cos(rad) * 6;
                  const y1 = 24 + Math.sin(rad) * 6;
                  const x2 = 24 + Math.cos(rad) * 16;
                  const y2 = 24 + Math.sin(rad) * 16;
                  return (
                    <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4E4E6E" strokeWidth={2.5} strokeLinecap="round" />
                  );
                })}
              </Svg>
            </Animated.View>

            {/* Right reel */}
            <Animated.View style={[styles.reelContainer, styles.rightReel, { transform: [{ rotate: rightRotate }] }]}>
              <View style={[styles.tapeDisc, { width: rightTapeRadius * 2, height: rightTapeRadius * 2, borderRadius: rightTapeRadius }]} />
              <Svg width={48} height={48} viewBox="0 0 48 48" style={styles.reelSvg}>
                <Circle cx={24} cy={24} r={22} stroke="rgba(60,60,96,0.45)" strokeWidth={2} fill="none" />
                <Circle cx={24} cy={24} r={10} fill="#1A1A36" stroke="#3E3E5E" strokeWidth={2} />
                <Circle cx={24} cy={24} r={4} fill="#5E5E80" />
                {[0, 60, 120, 180, 240, 300].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 24 + Math.cos(rad) * 6;
                  const y1 = 24 + Math.sin(rad) * 6;
                  const x2 = 24 + Math.cos(rad) * 16;
                  const y2 = 24 + Math.sin(rad) * 16;
                  return (
                    <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4E4E6E" strokeWidth={2.5} strokeLinecap="round" />
                  );
                })}
              </Svg>
            </Animated.View>

            {/* Guide posts */}
            <View style={[styles.guidePost, { left: '8%' }]} />
            <View style={[styles.guidePost, { left: '24%' }]} />
            <View style={[styles.guidePost, { right: '24%' }]} />
            <View style={[styles.guidePost, { right: '8%' }]} />

            {/* Head assembly */}
            <View style={styles.headAssembly}>
              <View style={styles.capstan} />
              <View style={styles.roller} />
              <View style={styles.mainHead} />
              <View style={styles.mainHead} />
              <View style={styles.roller} />
              <View style={styles.capstan} />
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Dolby NR · HX Pro</Text>
        <Text style={styles.footerText}>© 2026 Grizzilla</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 14,
  },
  tapeWell: {
    backgroundColor: '#07071A',
    borderWidth: 2,
    borderColor: '#2A2A46',
    borderRadius: 8,
    padding: 12,
    // Shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  cassetteBody: {
    width: '100%',
    aspectRatio: 102 / 64,
    position: 'relative',
    backgroundColor: '#1C1C36',
    borderWidth: 1,
    borderColor: '#2A2A48',
    borderRadius: 8,
    overflow: 'hidden',
  },
  screw: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0E0E22',
    borderWidth: 1,
    borderColor: '#2E2E4A',
    zIndex: 4,
  },
  labelStrip: {
    position: 'absolute',
    top: '5%',
    left: '6%',
    right: '6%',
    height: '22%',
    backgroundColor: 'rgba(255,45,135,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.12)',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
    zIndex: 3,
  },
  labelText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,45,135,0.35)',
  },
  labelLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,45,135,0.08)',
  },
  tapeWindow: {
    position: 'absolute',
    top: '30%',
    left: '7%',
    right: '7%',
    bottom: '6%',
    backgroundColor: 'rgba(3,3,14,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.05)',
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbon: {
    position: 'absolute',
    top: '46%',
    left: '8%',
    right: '8%',
    height: '8%',
    backgroundColor: 'rgba(255,45,135,0.04)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,45,135,0.09)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,45,135,0.05)',
  },
  reelContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  leftReel: {
    left: '15%',
  },
  rightReel: {
    right: '15%',
  },
  reelSvg: {
    position: 'absolute',
  },
  tapeDisc: {
    position: 'absolute',
    backgroundColor: 'rgba(255,45,135,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,135,0.07)',
  },
  guidePost: {
    position: 'absolute',
    width: 4,
    height: 14,
    backgroundColor: '#4A4A6E',
    borderWidth: 1,
    borderColor: '#4A4A6E',
    borderRadius: 2,
    top: '42%',
    zIndex: 2,
  },
  headAssembly: {
    position: 'absolute',
    bottom: -3,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    zIndex: 3,
  },
  capstan: {
    width: 3,
    height: 14,
    backgroundColor: '#6A6A8E',
    borderRadius: 2,
  },
  roller: {
    width: 8,
    height: 12,
    backgroundColor: '#252542',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
  },
  mainHead: {
    width: 10,
    height: 9,
    backgroundColor: '#4A4A6E',
    borderWidth: 1,
    borderColor: '#5A5A7E',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 7,
    color: '#1E1E38',
    letterSpacing: 0.5,
  },
});
