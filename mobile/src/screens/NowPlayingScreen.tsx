// Full-screen Now Playing screen — expanded from MiniPlayer
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Dimensions,
  ScrollView, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer, formatTime } from '../lib/player';
import YouTubePlayerComponent from '../components/YouTubePlayer';
import CassetteDeck from '../components/CassetteDeck';
import { colors, radii, spacing } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = SCREEN_WIDTH - spacing.lg * 2;

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  podcast: 'Podcast',
  bandcamp: 'Bandcamp',
  tiktok: 'TikTok',
};

export default function NowPlayingScreen() {
  const navigation = useNavigation<any>();
  const {
    currentTrack, isPlaying, position, duration, queue,
    togglePlayPause, skipNext, skipPrev, seekTo, isYouTubeTrack,
    updateYouTubeProgress, handleYouTubeStateChange,
    shuffle, repeatMode, toggleShuffle, cycleRepeat,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);

  if (!currentTrack) {
    navigation.goBack();
    return null;
  }

  const progress = duration > 0 ? position / duration : 0;
  const platformLabel = PLATFORM_LABELS[currentTrack.source_platform] || currentTrack.source_platform;

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `${currentTrack.title} by ${currentTrack.artist}\n${currentTrack.source_url}`,
      });
    } catch {}
  };

  const handleScrub = (evt: any) => {
    if (duration <= 0) return;
    const x = evt.nativeEvent.locationX;
    const barWidth = SCREEN_WIDTH - spacing.lg * 2;
    const pct = Math.max(0, Math.min(1, x / barWidth));
    seekTo(Math.floor(pct * duration));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-down" size={28} color={colors.pearl} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>NOW PLAYING</Text>
          <Text style={styles.headerPlatform}>{platformLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="share-outline" size={22} color={colors.silver} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQueue(!showQueue)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="list" size={24} color={showQueue ? colors.pink : colors.silver} />
          </TouchableOpacity>
        </View>
      </View>

      {showQueue ? (
        /* Queue view */
        <ScrollView style={styles.queueContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.queueTitle}>Up Next ({queue.length})</Text>
          {queue.length === 0 ? (
            <Text style={styles.queueEmpty}>Nothing in the queue.</Text>
          ) : (
            queue.map((t, i) => (
              <View key={`${t.id}-${i}`} style={styles.queueRow}>
                <Text style={styles.queueNum}>{i + 1}</Text>
                <View style={styles.queueThumbWrap}>
                  {t.thumbnail_url ? (
                    <Image source={{ uri: t.thumbnail_url }} style={styles.queueThumb} />
                  ) : (
                    <Ionicons name="musical-note" size={16} color={colors.silver} />
                  )}
                </View>
                <View style={styles.queueInfo}>
                  <Text style={styles.queueTrackTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.queueArtist} numberOfLines={1}>{t.artist}</Text>
                </View>
                <Text style={styles.queueDur}>{formatTime(t.duration_seconds)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        /* Main player view */
        <View style={styles.main}>
          {/* Artwork / YouTube player */}
          {isYouTubeTrack ? (
            <View style={styles.youtubeWrap}>
              <YouTubePlayerComponent
                videoId={currentTrack.source_id}
                playing={isPlaying}
                onProgress={updateYouTubeProgress}
                onStateChange={handleYouTubeStateChange}
                height={Math.round(ART_SIZE * 9 / 16)}
              />
            </View>
          ) : (
            <View style={styles.nonYtVisual}>
              {/* Cassette Deck animation */}
              <CassetteDeck isPlaying={isPlaying} progress={progress} trackTitle={currentTrack.title} />

              {/* Thumbnail below deck if available */}
              {currentTrack.thumbnail_url ? (
                <View style={styles.artworkSmallWrap}>
                  <Image source={{ uri: currentTrack.thumbnail_url }} style={styles.artworkSmall} />
                </View>
              ) : null}
            </View>
          )}

          {/* Track info */}
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>

          {/* Progress bar */}
          <TouchableOpacity
            style={styles.progressContainer}
            onPress={handleScrub}
            activeOpacity={1}
          >
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressDot, { left: `${progress * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </TouchableOpacity>

          {/* Transport controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.modeBtn}>
              <Ionicons name="shuffle" size={22} color={shuffle ? colors.pink : colors.ash} />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipPrev} style={styles.sideBtn}>
              <Ionicons name="play-skip-back" size={32} color={colors.pearl} />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color={colors.ink} />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipNext} style={styles.sideBtn}>
              <Ionicons name="play-skip-forward" size={32} color={colors.pearl} />
            </TouchableOpacity>

            <TouchableOpacity onPress={cycleRepeat} style={styles.modeBtn}>
              <Ionicons
                name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                size={22}
                color={repeatMode !== 'off' ? colors.pink : colors.ash}
              />
              {repeatMode === 'one' && <Text style={styles.repeatOneBadge}>1</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerLabel: {
    color: colors.silver,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerPlatform: {
    color: colors.pearl,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  main: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  youtubeWrap: {
    width: ART_SIZE,
    alignSelf: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
  },
  nonYtVisual: {
    alignSelf: 'center',
    width: ART_SIZE,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  artworkSmallWrap: {
    width: ART_SIZE * 0.4,
    height: ART_SIZE * 0.4,
    alignSelf: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  artworkSmall: {
    width: ART_SIZE * 0.4,
    height: ART_SIZE * 0.4,
  },
  trackInfo: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.pearl,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  artist: {
    color: colors.silver,
    fontSize: 15,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBg: {
    height: 4,
    backgroundColor: colors.graphite,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.pink,
    borderRadius: 2,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.pearl,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    color: colors.ash,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    marginTop: spacing.md,
  },
  modeBtn: {
    padding: 8,
    position: 'relative',
  },
  repeatOneBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    fontSize: 8,
    fontWeight: '900',
    color: colors.pink,
  },
  sideBtn: {
    padding: 8,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Queue styles
  queueContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  queueTitle: {
    color: colors.pearl,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  queueEmpty: {
    color: colors.silver,
    fontSize: 14,
    textAlign: 'center',
    paddingTop: spacing.xxl,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate,
  },
  queueNum: {
    color: colors.ash,
    fontSize: 12,
    width: 20,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  queueThumbWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.graphite,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueThumb: {
    width: 36,
    height: 36,
  },
  queueInfo: {
    flex: 1,
    minWidth: 0,
  },
  queueTrackTitle: {
    color: colors.pearl,
    fontSize: 13,
    fontWeight: '600',
  },
  queueArtist: {
    color: colors.silver,
    fontSize: 11,
    marginTop: 1,
  },
  queueDur: {
    color: colors.ash,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
