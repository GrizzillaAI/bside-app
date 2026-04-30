// Persistent mini-player bar above the bottom tabs
// Tapping opens the full Now Playing screen
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer, formatTime } from '../lib/player';
import YouTubePlayerComponent from './YouTubePlayer';
import { colors, radii } from '../lib/theme';

export default function MiniPlayer() {
  const {
    currentTrack, isPlaying, togglePlayPause, skipNext,
    position, duration, isYouTubeTrack,
    updateYouTubeProgress, handleYouTubeStateChange,
  } = usePlayer();
  const navigation = useNavigation<any>();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.wrapper}>
      {/* Hidden YouTube player for audio-only mode when MiniPlayer is showing */}
      {isYouTubeTrack && (
        <YouTubePlayerComponent
          videoId={currentTrack.source_id}
          playing={isPlaying}
          onProgress={updateYouTubeProgress}
          onStateChange={handleYouTubeStateChange}
          minimized
        />
      )}

      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('NowPlaying')}
      >
        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.content}>
          {/* Thumbnail */}
          <View style={styles.thumbWrap}>
            {currentTrack.thumbnail_url ? (
              <Image source={{ uri: currentTrack.thumbnail_url }} style={styles.thumb} />
            ) : (
              <Ionicons name="musical-note" size={20} color={colors.silver} />
            )}
          </View>

          {/* Track info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>

          {/* Controls */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
            style={styles.btn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={colors.pearl} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); skipNext(); }}
            style={styles.btn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-skip-forward" size={20} color={colors.silver} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    backgroundColor: colors.void,
    borderTopWidth: 1,
    borderTopColor: colors.slate,
  },
  progressBg: {
    height: 2,
    backgroundColor: colors.graphite,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.pink,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  thumbWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.graphite,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: 40,
    height: 40,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.pearl,
    fontSize: 13,
    fontWeight: '600',
  },
  artist: {
    color: colors.silver,
    fontSize: 11,
    marginTop: 1,
  },
  btn: {
    padding: 4,
  },
});
