// B-Side API client — calls Supabase Edge Functions + direct DB queries
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// YouTube Search
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
