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

export async function searchAll(
  query: string,
  sources: SourcePlatform[] = ['youtube', 'spotify', 'applemusic', 'soundcloud'],
  perSourceLimit = 10,
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
  duration_seconds: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

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
      duration_seconds: track.duration_seconds,
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
