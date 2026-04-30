// Mixd — YouTube Connect client library
// Handles: OAuth 2.0 authorization code flow, token caching with auto-refresh,
// connection state, and playlist import.

import { supabase } from './supabase';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const LS_STATE = 'mixd.youtube.oauth_state';
const LS_RETURN = 'mixd.youtube.return_to';

// Scopes: read-only access to user's YouTube playlists + basic profile
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'openid',
  'email',
  'profile',
].join(' ');

export interface YouTubeConnection {
  user_id: string;
  youtube_channel_id: string | null;
  expires_at: string;
  scope: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  connected_at: string;
  updated_at: string;
}

export interface YouTubePlaylistSummary {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  item_count: number;
}

export interface YouTubePlaylistItem {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  position: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function randomString(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => ('0' + (b % 36).toString(36)).slice(-1)).join('');
}

// ── OAuth init ────────────────────────────────────────────────────────────
/** Kicks off the YouTube/Google OAuth flow. Redirects the browser to Google. */
export function beginYouTubeOAuth(returnTo = '/app/settings'): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Missing VITE_GOOGLE_CLIENT_ID env var');

  const state = randomString(32);
  localStorage.setItem(LS_STATE, state);
  localStorage.setItem(LS_RETURN, returnTo);

  const redirectUri = `${window.location.origin}/auth/youtube/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: YOUTUBE_SCOPES,
    state,
    access_type: 'offline',    // Get a refresh token
    prompt: 'consent',         // Always show consent to get refresh_token
  });
  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ── Callback handler ──────────────────────────────────────────────────────
/**
 * Call from the /auth/youtube/callback page. Validates state, exchanges the
 * code via the Edge Function, and clears local OAuth storage.
 */
export async function completeYouTubeOAuth(
  code: string,
  state: string,
): Promise<{ ok: true; returnTo: string } | { ok: false; error: string }> {
  const storedState = localStorage.getItem(LS_STATE);
  const returnTo = localStorage.getItem(LS_RETURN) ?? '/app/settings';

  if (!storedState || storedState !== state) {
    return { ok: false, error: 'OAuth state mismatch. Try connecting again.' };
  }

  const redirectUri = `${window.location.origin}/auth/youtube/callback`;
  const { data, error } = await supabase.functions.invoke('youtube-token-exchange', {
    body: { code, redirect_uri: redirectUri },
  });

  // Clear OAuth state regardless of outcome
  localStorage.removeItem(LS_STATE);
  localStorage.removeItem(LS_RETURN);

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, returnTo };
}

// ── Connection state ──────────────────────────────────────────────────────
export async function getMyYouTubeConnection(): Promise<YouTubeConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('youtube_connections')
    .select('user_id, youtube_channel_id, expires_at, scope, display_name, email, avatar_url, connected_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as YouTubeConnection) ?? null;
}

export async function disconnectYouTube(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('youtube_connections').delete().eq('user_id', user.id);
}

// ── Playlist fetching ────────────────────────────────────────────────────
/** Fetches the user's YouTube playlists via edge function (needs valid token) */
export async function getMyYouTubePlaylists(): Promise<YouTubePlaylistSummary[]> {
  const { data, error } = await supabase.functions.invoke('youtube-playlists', {
    body: { action: 'list' },
  });
  if (error) throw new Error(error.message);
  return data?.playlists ?? [];
}

/** Fetches all items in a specific YouTube playlist */
export async function getYouTubePlaylistItems(playlistId: string): Promise<YouTubePlaylistItem[]> {
  const { data, error } = await supabase.functions.invoke('youtube-playlists', {
    body: { action: 'items', playlist_id: playlistId },
  });
  if (error) throw new Error(error.message);
  return data?.items ?? [];
}
