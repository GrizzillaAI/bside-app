// Mixd API client — calls Supabase Edge Functions + direct DB queries
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Unified Multi-Source Search
// ---------------------------------------------------------------------------
export type SourcePlatform = 'youtube' | 'spotify' | 'applemusic' | 'soundcloud';

// Unified result shape — every source normalizes to this
export interface UnifiedResult {
  source_platform: SourcePlatform;
  source_id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail_url: string;
  duration_seconds: number;
  duration_display: string;
  external_url: string;
  // Source-specific playback fields
  preview_url?: string | null;   // spotify / applemusic (30s)
  stream_url?: string | null;    // soundcloud raw transcoding URL
  video_id?: string;             // youtube-only (legacy)
  // Metadata
  explicit?: boolean;
  popularity?: number;
  plays?: number;
  likes?: number;
  view_count?: string;
  published_at?: string;
  release_date?: string;
}

// ---------------------------------------------------------------------------
// YouTube Search (legacy — kept for extractor flow)
// ---------------------------------------------------------------------------
export interface SearchResult {
  video_id: string;
  title: string;
  channel_title: string;
  channel_id: string;
  thumbnail_url: string;
  duration_seconds: number;
  duration_display: string;
  view_count: string;
  published_at: string;
}

export async function searchYouTube(query: string, maxResults = 20): Promise<{
  results: SearchResult[];
  nextPageToken: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('youtube-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Spotify Search
// ---------------------------------------------------------------------------
export async function searchSpotify(query: string, maxResults = 20): Promise<{
  results: UnifiedResult[];
}> {
  const { data, error } = await supabase.functions.invoke('spotify-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

// ---------------------------------------------------------------------------
// Apple Music / iTunes Search
// ---------------------------------------------------------------------------
export async function searchAppleMusic(query: string, maxResults = 20): Promise<{
  results: UnifiedResult[];
}> {
  const { data, error } = await supabase.functions.invoke('applemusic-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

// ---------------------------------------------------------------------------
// SoundCloud Search
// ---------------------------------------------------------------------------
export async function searchSoundCloud(query: string, maxResults = 20): Promise<{
  results: UnifiedResult[];
}> {
  const { data, error } = await supabase.functions.invoke('soundcloud-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

// ---------------------------------------------------------------------------
// Unified search — fan out across all connected platforms in parallel.
// Each source failure is isolated; one slow/broken provider doesn't kill the feed.
// Returns merged results plus a per-source status map so the UI can show badges.
// ---------------------------------------------------------------------------
export interface MultiSourceStatus {
  youtube: 'ok' | 'error' | 'skipped';
  spotify: 'ok' | 'error' | 'skipped';
  applemusic: 'ok' | 'error' | 'skipped';
  soundcloud: 'ok' | 'error' | 'skipped';
}

// Phase 1 default sources: YouTube + Spotify (Premium-gated) + SoundCloud.
// Apple Music is deferred to Phase 2 — the Edge Function remains deployed but
// is not included in the default fan-out.
export const PHASE_1_SOURCES: SourcePlatform[] = ['youtube', 'spotify', 'soundcloud'];

export async function searchAll(
  query: string,
  sources: SourcePlatform[] = PHASE_1_SOURCES,
  perSourceLimit = 25,
): Promise<{ results: UnifiedResult[]; status: MultiSourceStatus; errors: Record<string, string> }> {
  const status: MultiSourceStatus = {
    youtube: 'skipped',
    spotify: 'skipped',
    applemusic: 'skipped',
    soundcloud: 'skipped',
  };
  const errors: Record<string, string> = {};

  const tasks = sources.map(async (src) => {
    try {
      if (src === 'youtube') {
        const { results } = await searchYouTube(query, perSourceLimit);
        status.youtube = 'ok';
        return results.map((r): UnifiedResult => ({
          source_platform: 'youtube',
          source_id: r.video_id,
          video_id: r.video_id,
          title: r.title,
          artist: r.channel_title,
          thumbnail_url: r.thumbnail_url,
          duration_seconds: r.duration_seconds,
          duration_display: r.duration_display,
          external_url: `https://www.youtube.com/watch?v=${r.video_id}`,
          view_count: r.view_count,
          published_at: r.published_at,
        }));
      }
      if (src === 'spotify') {
        const { results } = await searchSpotify(query, perSourceLimit);
        status.spotify = 'ok';
        return results;
      }
      if (src === 'applemusic') {
        const { results } = await searchAppleMusic(query, perSourceLimit);
        status.applemusic = 'ok';
        return results;
      }
      if (src === 'soundcloud') {
        const { results } = await searchSoundCloud(query, perSourceLimit);
        status.soundcloud = 'ok';
        return results;
      }
      return [];
    } catch (err) {
      status[src] = 'error';
      errors[src] = (err as Error).message;
      return [];
    }
  });

  const perSource = await Promise.all(tasks);
  // Interleave results so the feed feels balanced across sources (round-robin)
  const merged: UnifiedResult[] = [];
  const maxLen = Math.max(...perSource.map((s) => s.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const src of perSource) {
      if (src[i]) merged.push(src[i]);
    }
  }
  return { results: merged, status, errors };
}

// ---------------------------------------------------------------------------
// SoundCloud Stream Resolver
// Resolves a CORS-safe CDN URL for a SoundCloud track. The API stream URL
// returns a 302 redirect that browsers can't follow due to CORS, so we
// resolve it server-side and return the final CDN URL.
// ---------------------------------------------------------------------------
export async function resolveSoundCloudStream(trackId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('soundcloud-resolve', {
    body: { trackId },
  });
  if (error) throw new Error(error.message);
  if (!data?.stream_url) throw new Error('No stream URL returned');
  return data.stream_url;
}

// ---------------------------------------------------------------------------
// Audio Extraction
// ---------------------------------------------------------------------------
export interface ExtractionResult {
  audio_url: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  duration_seconds: number;
  source_platform: string;
  source_id: string;
  source_url: string;
  fallback?: boolean;
}

export async function extractAudio(urlOrVideoId: string): Promise<ExtractionResult> {
  const isVideoId = /^[a-zA-Z0-9_-]{11}$/.test(urlOrVideoId);
  const { data, error } = await supabase.functions.invoke('extract-audio', {
    body: isVideoId ? { videoId: urlOrVideoId } : { url: urlOrVideoId },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Track Engagement — Reactions
// ---------------------------------------------------------------------------
export async function getTrackReactions(trackId: string) {
  const { data, error } = await supabase
    .from('track_reaction_counts')
    .select('*')
    .eq('track_id', trackId)
    .single();
  return { likeCount: data?.like_count ?? 0, dislikeCount: data?.dislike_count ?? 0 };
}

export async function getMyReaction(trackId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('track_reactions')
    .select('reaction')
    .eq('track_id', trackId)
    .eq('user_id', user.id)
    .single();
  return data?.reaction ?? null;
}

export async function setReaction(trackId: string, reaction: 'like' | 'dislike') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Check existing reaction
  const { data: existing } = await supabase
    .from('track_reactions')
    .select('id, reaction')
    .eq('track_id', trackId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.reaction === reaction) {
      // Toggle off — remove reaction
      await supabase.from('track_reactions').delete().eq('id', existing.id);
      return null;
    }
    // Switch reaction
    await supabase.from('track_reactions').update({ reaction }).eq('id', existing.id);
    return reaction;
  }

  // Create new reaction
  await supabase.from('track_reactions').insert({
    user_id: user.id,
    track_id: trackId,
    reaction,
  });
  return reaction;
}

// ---------------------------------------------------------------------------
// Track Engagement — Comments
// ---------------------------------------------------------------------------
export async function getComments(trackId: string) {
  const { data, error } = await supabase
    .from('track_comments')
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .eq('track_id', trackId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addComment(trackId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('track_comments')
    .insert({ user_id: user.id, track_id: trackId, body })
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('track_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Tracks — save to library
// ---------------------------------------------------------------------------
export async function saveTrackToLibrary(track: {
  title: string;
  artist: string;
  source_platform: string;
  source_url: string;
  source_id: string;
  thumbnail_url: string;
  duration_seconds: number | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Normalize duration — if the source didn't return a valid duration,
  // send null rather than 0 or NaN so the DB check constraint is satisfied.
  const dur =
    typeof track.duration_seconds === 'number' &&
    Number.isFinite(track.duration_seconds) &&
    track.duration_seconds > 0
      ? Math.round(track.duration_seconds)
      : null;

  // Upsert the track
  const { data: trackRow, error: trackErr } = await supabase
    .from('tracks')
    .upsert({
      user_id: user.id,
      title: track.title,
      artist: track.artist,
      source_platform: track.source_platform,
      source_url: track.source_url,
      source_id: track.source_id,
      thumbnail_url: track.thumbnail_url,
      duration_seconds: dur,
    }, { onConflict: 'user_id,source_platform,source_id' })
    .select()
    .single();

  if (trackErr) throw new Error(trackErr.message);

  // Add to library
  const { error: libErr } = await supabase
    .from('library_tracks')
    .upsert({ user_id: user.id, track_id: trackRow.id }, { onConflict: 'user_id,track_id' });

  if (libErr) throw new Error(libErr.message);
  return trackRow;
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------
export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_url: string | null;
  track_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrackItem {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  track: {
    id: string;
    title: string;
    artist: string | null;
    source_platform: string;
    source_url: string;
    source_id: string | null;
    thumbnail_url: string | null;
    duration_seconds: number | null;
  };
}

/** Fetch all playlists for the current user */
export async function getMyPlaylists(): Promise<Playlist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Playlist[];
}

/** Create a new playlist */
export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: user.id, name, description: description || null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Playlist;
}

/** Delete a playlist */
export async function deletePlaylist(playlistId: string): Promise<void> {
  // Delete playlist tracks first, then the playlist
  await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId);
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw new Error(error.message);
}

/** Get tracks in a playlist */
export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrackItem[]> {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('*, track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PlaylistTrackItem[];
}

/** Add a track to a playlist. Saves the track to the tracks table first if needed. */
export async function addTrackToPlaylist(
  playlistId: string,
  track: {
    title: string;
    artist: string;
    source_platform: string;
    source_url: string;
    source_id: string;
    thumbnail_url: string;
    duration_seconds: number | null;
  },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Normalize duration
  const dur =
    typeof track.duration_seconds === 'number' &&
    Number.isFinite(track.duration_seconds) &&
    track.duration_seconds > 0
      ? Math.round(track.duration_seconds)
      : null;

  // Upsert the track
  const { data: trackRow, error: trackErr } = await supabase
    .from('tracks')
    .upsert({
      user_id: user.id,
      title: track.title,
      artist: track.artist,
      source_platform: track.source_platform,
      source_url: track.source_url,
      source_id: track.source_id,
      thumbnail_url: track.thumbnail_url,
      duration_seconds: dur,
    }, { onConflict: 'user_id,source_platform,source_id' })
    .select()
    .single();
  if (trackErr) throw new Error(trackErr.message);

  // Get the next position
  const { data: existing } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;

  // Check if track is already in this playlist
  const { data: dup } = await supabase
    .from('playlist_tracks')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('track_id', trackRow.id)
    .maybeSingle();
  if (dup) return; // Already in playlist

  // Insert
  const { error: ptErr } = await supabase
    .from('playlist_tracks')
    .insert({ playlist_id: playlistId, track_id: trackRow.id, position: nextPos });
  if (ptErr) throw new Error(ptErr.message);

  // Update track_count
  await supabase
    .from('playlists')
    .update({ track_count: nextPos + 1, updated_at: new Date().toISOString() })
    .eq('id', playlistId);
}

/** Remove a track from a playlist */
export async function removeTrackFromPlaylist(playlistTrackId: string, playlistId: string): Promise<void> {
  const { error } = await supabase.from('playlist_tracks').delete().eq('id', playlistTrackId);
  if (error) throw new Error(error.message);

  // Recount
  const { count } = await supabase
    .from('playlist_tracks')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', playlistId);
  await supabase
    .from('playlists')
    .update({ track_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq('id', playlistId);
}
