// YouTube player component using react-native-youtube-iframe
// Integrates with the PlayerContext for unified playback control
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';
import { colors } from '../lib/theme';

interface YouTubePlayerProps {
  videoId: string;
  playing: boolean;
  onStateChange?: (state: string) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onReady?: () => void;
  height?: number;
  /** If true, renders a minimal 1px player (audio-only mode for MiniPlayer) */
  minimized?: boolean;
}

export default function YouTubePlayerComponent({
  videoId,
  playing,
  onStateChange,
  onProgress,
  onReady,
  height = 220,
  minimized = false,
}: YouTubePlayerProps) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll current time when playing
  useEffect(() => {
    if (playing && playerRef.current) {
      intervalRef.current = setInterval(async () => {
        try {
          const currentTime = await playerRef.current?.getCurrentTime();
          const dur = await playerRef.current?.getDuration();
          if (currentTime != null && dur != null && onProgress) {
            onProgress(currentTime, dur);
          }
        } catch {}
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, onProgress]);

  const handleStateChange = useCallback(
    (state: string) => {
      onStateChange?.(state);
    },
    [onStateChange]
  );

  if (!videoId) return null;

  return (
    <View style={[styles.container, minimized && styles.minimized]}>
      <YoutubePlayer
        ref={playerRef}
        height={minimized ? 1 : height}
        width={minimized ? 1 : undefined}
        videoId={videoId}
        play={playing}
        onChangeState={handleStateChange}
        onReady={() => onReady?.()}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          injectedJavaScript: `
            document.body.style.backgroundColor = '${colors.ink}';
            true;
          `,
        }}
        initialPlayerParams={{
          preventFullScreen: false,
          controls: false,
          modestbranding: true,
          rel: false,
          color: 'white',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.ink,
    overflow: 'hidden',
    borderRadius: 8,
  },
  minimized: {
    width: 1,
    height: 1,
    position: 'absolute',
    opacity: 0,
  },
});
