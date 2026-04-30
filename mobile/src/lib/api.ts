// Mixd Mobile — API client (mirrors web api.ts)
// Calls Supabase Edge Functions + direct DB queries
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SourcePlatform = 'youtube' | 'spotify' | 'applemusic' | 'soundcloud' | 'podcast' | 'bandcamp';

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
  preview_url?: string | null;
  stream_url?: string | null;
  video_id?: string;
  explicit?: boolean;
  popularity?: number;
  plays?: number;
  likes?: number;
  view_count?: string;
  published_at?: string;
  release_date?: string;
}

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

// ---------------------------------------------------------------------------
// Search functions
// ---------------------------------------------------------------------------
export async function searchYouTube(query: string, maxResults = 20) {
  const { data, error } = await supabase.functions.invoke('youtube-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data as { results: SearchResult[]; nextPageToken: string | null };
}

export async function searchSpotify(query: string, maxResults = 20) {
  const { data, error } = await supabase.functions.invoke('spotify-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

export async function searchSoundCloud(query: string, maxResults = 20) {
  const { data, error } = await supabase.functions.invoke('soundcloud-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

export async function searchPodcast(query: string, maxResults = 20) {
  const { data, error } = await supabase.functions.invoke('podcast-search', {
    body: { query, maxResults },
  });
  if (error) throw new Error(error.message);
  return data ?? { results: [] };
}

// ---------------------------------------------------------------------------
// Multi-source search
// ---------------------------------------------------------------------------
export const PHASE_1_SOURCES: SourcePlatform[] = ['youtube', 'spotify', 'soundcloud', 'podcast'];

export interface MultiSourceStatus {
  youtube: 'ok' | 'error' | 'skipped';
  spotify: 'ok' | 'error' | 'skipped';
  applemusic: 'ok' | 'error' | 'skipped';
  soundcloud: 'ok' | 'error' | 'skipped';
  podcast: 'ok' | 'error' | 'skipped';
  bandcamp: 'ok' | 'error' | 'skipped';
}

export async function searchAll(
  query: string,
  sources: SourcePlatform[] = PHASE_1_SOURCES,
  perSourceLimit = 25,
): Promise<{ results: UnifiedResult[]; status: MultiSourceStatus; errors: Record<string, string> }> {
  const status: MultiSourceStatus = {
    youtube: 'skipped', spotify: 'skipped', applemusic: 'skipped',
    soundcloud: 'skipped', podcast: 'skipped', bandcamp: 'skipped',
  };
  const errors: Record<string, string> = {};

  const tasks = sources.map(async (src) => {
    try {
      if (src === 'youtube') {
        const { results } = await searchYouTube(query, perSourceLimit);
        status.youtube = 'ok';
        return results.map((r): UnifiedResult => ({
          source_platform: 'youtube', source_id: r.video_id, video_id: r.video_id,
          title: r.title, artist: r.channel_title, thumbnail_url: r.thumbnail_url,
          duration_seconds: r.duration_seconds, duration_display: r.duration_display,
          external_url: `https://www.youtube.com/watch?v=${r.video_id}`,
          view_count: r.view_count, published_at: r.published_at,
        }));
      }
      if (src === 'spotify') { const { results } = await searchSpotify(query, perSourceLimit); status.spotify = 'ok'; return results; }
      if (src === 'soundcloud') { const { results } = await searchSoundCloud(query, perSourceLimit); status.soundcloud = 'ok'; return results; }
      if (src === 'podcast') { const { results } = await searchPodcast(query, perSourceLimit); status.podcast = 'ok'; return results; }
      return [];
    } catch (err) {
      status[src] = 'error';
      errors[src] = (err as Error).message;
      return [];
    }
  });

  const perSource = await Promise.all(tasks);
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
// Track helpers
// ---------------------------------------------------------------------------
export async function saveTrackToLibrary(track: {
  title: string; artist: string; source_platform: string; source_url: string;
  source_id: string; thumbnail_url: string; duration_seconds: number | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const dur = typeof track.duration_seconds === 'number' && Number.isFinite(track.duration_seconds) && track.duration_seconds > 0
    ? Math.round(track.duration_seconds) : null;

  const { data: trackRow, error: trackErr } = await supabase
    .from('tracks')
    .upsert({
      user_id: user.id, title: track.title, artist: track.artist,
      source_platform: track.source_platform, source_url: track.source_url,
      source_id: track.source_id, thumbnail_url: track.thumbnail_url, duration_seconds: dur,
    }, { onConflict: 'user_id,source_platform,source_id' })
    .select().single();
  if (trackErr) throw new Error(trackErr.message);

  const { error: libErr } = await supabase
    .from('library_tracks')
    .upsert({ user_id: user.id, track_id: trackRow.id }, { onConflict: 'user_id,track_id' });
  if (libErr) throw new Error(libErr.message);

  logB3Event('track.saved', { track_id: trackRow.id, source_platform: track.source_platform, title: track.title });
  return trackRow;
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------
export interface Playlist {
  id: string; user_id: string; name: string; description: string | null;
  is_public: boolean; cover_url: string | null; track_count: number;
  created_at: string; updated_at: string;
}

export async function getMyPlaylists(): Promise<Playlist[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('playlists').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Playlist[];
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase.from('playlists').insert({ user_id: user.id, name, description: description || null }).select().single();
  if (error) throw new Error(error.message);
  logB3Event('playlist.created', { playlist_id: data.id, name });
  return data as Playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId);
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw new Error(error.message);
}

export async function getPlaylistTracks(playlistId: string) {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('*, track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
    .eq('playlist_id', playlistId).order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addTrackToPlaylist(playlistId: string, track: {
  title: string; artist: string; source_platform: string; source_url: string;
  source_id: string; thumbnail_url: string; duration_seconds: number | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const dur = typeof track.duration_seconds === 'number' && Number.isFinite(track.duration_seconds) && track.duration_seconds > 0
    ? Math.round(track.duration_seconds) : null;
  const { data: trackRow, error: trackErr } = await supabase
    .from('tracks').upsert({
      user_id: user.id, title: track.title, artist: track.artist,
      source_platform: track.source_platform, source_url: track.source_url,
      source_id: track.source_id, thumbnail_url: track.thumbnail_url, duration_seconds: dur,
    }, { onConflict: 'user_id,source_platform,source_id' }).select().single();
  if (trackErr) throw new Error(trackErr.message);

  const { data: existing } = await supabase.from('playlist_tracks').select('position').eq('playlist_id', playlistId).order('position', { ascending: false }).limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;
  const { data: dup } = await supabase.from('playlist_tracks').select('id').eq('playlist_id', playlistId).eq('track_id', trackRow.id).maybeSingle();
  if (dup) return;
  const { error: ptErr } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: trackRow.id, position: nextPos });
  if (ptErr) throw new Error(ptErr.message);
  await supabase.from('playlists').update({ track_count: nextPos + 1, updated_at: new Date().toISOString() }).eq('id', playlistId);
}

// ---------------------------------------------------------------------------
// B3 Event logging (fire-and-forget)
// ---------------------------------------------------------------------------
export function logB3Event(eventType: string, properties: Record<string, unknown> = {}) {
  supabase.functions
    .invoke('b3-event', { body: { event_type: eventType, properties } })
    .catch((err) => console.warn('B3 event log failed:', err));
}

// ---------------------------------------------------------------------------
// SoundCloud stream resolver
// ---------------------------------------------------------------------------
export async function resolveSoundCloudStream(trackId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('soundcloud-resolve', { body: { trackId } });
  if (error) throw new Error(error.message);
  if (!data?.stream_url) throw new Error('No stream URL returned');
  return data.stream_url;
}
