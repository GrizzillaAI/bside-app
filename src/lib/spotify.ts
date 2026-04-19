// Mixd — Spotify Connect client library
// Handles: OAuth PKCE flow, token caching with auto-refresh, connection state,
// and Web Playback SDK integration for full-track playback (Premium users only).

import { supabase } from './supabase';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const LS_VERIFIER = 'mixd.spotify.pkce_verifier';
const LS_STATE = 'mixd.spotify.oauth_state';
const LS_RETURN = 'mixd.spotify.return_to';

// Scopes needed for Web Playback SDK + basic profile read
const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export interface SpotifyConnection {
  user_id: string;
  spotify_user_id: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  is_premium: boolean;
  display_name: string | null;
  email: string | null;
  connected_at: string;
  updated_at: string;
}

// ── PKCE helpers ──────────────────────────────────────────────────────────
function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => ('0' + (b % 36).toString(36)).slice(-1)).join('');
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

// ── OAuth init ────────────────────────────────────────────────────────────
/** Kicks off the Spotify OAuth flow. Redirects the browser to Spotify. */
export async function beginSpotifyOAuth(returnTo = '/app/settings'): Promise<void> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID env var');
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(32);

  localStorage.setItem(LS_VERIFIER, verifier);
  localStorage.setItem(LS_STATE, state);
  localStorage.setItem(LS_RETURN, returnTo);

  const redirectUri = `${window.location.origin}/auth/spotify/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SPOTIFY_SCOPES,
  });
  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

// ── Callback handler ──────────────────────────────────────────────────────
/**
 * Call from the /auth/spotify/callback page. Validates state, exchanges the
 * code via the Edge Function, and clears local PKCE storage. Returns the
 * path to navigate to after completion.
 */
export async function completeSpotifyOAuth(
  code: string,
  state: string,
): Promise<{ ok: true; returnTo: string } | { ok: false; error: string }> {
  const storedState = localStorage.getItem(LS_STATE);
  const verifier = localStorage.getItem(LS_VERIFIER);
  const returnTo = localStorage.getItem(LS_RETURN) ?? '/app/settings';

  if (!storedState || storedState !== state) {
    return { ok: false, error: 'OAuth state mismatch. Try connecting again.' };
  }
  if (!verifier) {
    return { ok: false, error: 'Missing PKCE verifier. Try connecting again.' };
  }

  const redirectUri = `${window.location.origin}/auth/spotify/callback`;
  const { data, error } = await supabase.functions.invoke('spotify-token-exchange', {
    body: { code, redirect_uri: redirectUri, code_verifier: verifier },
  });

  // Clear PKCE state regardless of outcome
  localStorage.removeItem(LS_VERIFIER);
  localStorage.removeItem(LS_STATE);
  localStorage.removeItem(LS_RETURN);

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return { ok: true, returnTo };
}

// ── Connection state ──────────────────────────────────────────────────────
export async function getMySpotifyConnection(): Promise<SpotifyConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('spotify_connections')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as SpotifyConnection) ?? null;
}

export async function disconnectSpotify(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('spotify_connections').delete().eq('user_id', user.id);
  // Tear down any active Web Playback SDK instance
  if (activePlayer) {
    try { activePlayer.disconnect(); } catch { /* ignore */ }
    activePlayer = null;
    deviceId = null;
  }
}

// ── Token cache w/ auto-refresh ───────────────────────────────────────────
let cachedAccessToken: string | null = null;
let cachedExpiresAt: number = 0;

/**
 * Returns a valid Spotify access token, refreshing via the Edge Function
 * when within 2 minutes of expiry. Returns null if the user is not connected.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedAccessToken && cachedExpiresAt - now > 120_000) {
    return cachedAccessToken;
  }

  // Try to use the stored token if still valid
  const conn = await getMySpotifyConnection();
  if (!conn) return null;
  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - now > 120_000) {
    cachedAccessToken = conn.access_token;
    cachedExpiresAt = expiresAt;
    return cachedAccessToken;
  }

  // Refresh
  const { data, error } = await supabase.functions.invoke('spotify-token-refresh', {
    body: {},
  });
  if (error || data?.error) {
    console.warn('Spotify refresh failed:', error ?? data?.error);
    // Invalid refresh token — user must reconnect
    return null;
  }
  cachedAccessToken = data.access_token;
  cachedExpiresAt = new Date(data.expires_at).getTime();
  return cachedAccessToken;
}

// ── Web Playback SDK integration ──────────────────────────────────────────
// Loads Spotify's browser SDK once, instantiates a Player, and exposes
// deviceId + play/pause/seek helpers for the global player context.

// Types for the global Spotify SDK (loaded from CDN)
declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: any) => void) => boolean;
  removeListener: (event: string) => void;
  getCurrentState: () => Promise<any>;
  setVolume: (v: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
}

let activePlayer: SpotifyPlayer | null = null;
let deviceId: string | null = null;
let sdkLoadPromise: Promise<void> | null = null;
let playerReadyPromise: Promise<string> | null = null;

function loadSpotifySDK(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve) => {
    if (window.Spotify) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

/**
 * Initializes the Spotify Web Playback SDK and returns the device_id.
 * Subsequent calls return the cached device_id.
 */
export async function ensureSpotifyPlayer(): Promise<string | null> {
  if (deviceId && activePlayer) return deviceId;
  if (playerReadyPromise) return playerReadyPromise;

  playerReadyPromise = (async () => {
    await loadSpotifySDK();
    if (!window.Spotify) throw new Error('Spotify SDK failed to load');

    const player = new window.Spotify.Player({
      name: 'Mixd Web Player',
      getOAuthToken: (cb) => {
        getSpotifyAccessToken().then((t) => cb(t ?? ''));
      },
      volume: 0.75,
    });

    const readyId = await new Promise<string>((resolve, reject) => {
      player.addListener('ready', ({ device_id }: { device_id: string }) => resolve(device_id));
      player.addListener('initialization_error', ({ message }: { message: string }) => reject(new Error(message)));
      player.addListener('authentication_error', ({ message }: { message: string }) => reject(new Error(`Auth: ${message}`)));
      player.addListener('account_error', ({ message }: { message: string }) => reject(new Error(`Account: ${message}`)));
      player.connect();
    });

    activePlayer = player;
    deviceId = readyId;
    return readyId;
  })();

  try {
    return await playerReadyPromise;
  } catch (err) {
    playerReadyPromise = null;
    console.error('Spotify Player init failed:', err);
    return null;
  }
}

/**
 * Plays a Spotify track by URI (spotify:track:XXXX) via the Web Playback SDK.
 * Returns { ok: true } on success, or { ok: false, reason: string } with a
 * detailed diagnostic message on failure.
 */
export async function playSpotifyTrack(trackUri: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const token = await getSpotifyAccessToken();
  if (!token) return { ok: false, reason: 'No Spotify token — not connected or token refresh failed.' };

  const id = await ensureSpotifyPlayer();
  if (!id) return { ok: false, reason: 'Spotify Web Player failed to initialize (SDK did not connect).' };

  const resp = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [trackUri] }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    console.warn('Spotify play failed:', resp.status, err);
    if (resp.status === 403) return { ok: false, reason: `Spotify 403 Forbidden — Premium required or app not authorized. ${err}` };
    if (resp.status === 404) return { ok: false, reason: `Spotify 404 — device not found. Player may need re-init. ${err}` };
    return { ok: false, reason: `Spotify API error ${resp.status}: ${err}` };
  }
  return { ok: true };
}

export async function pauseSpotify(): Promise<void> {
  await activePlayer?.pause().catch(() => { /* ignore */ });
}

export async function resumeSpotify(): Promise<void> {
  await activePlayer?.resume().catch(() => { /* ignore */ });
}

export async function seekSpotify(ms: number): Promise<void> {
  await activePlayer?.seek(ms).catch(() => { /* ignore */ });
}

export async function setSpotifyVolume(vol: number): Promise<void> {
  await activePlayer?.setVolume(vol).catch(() => { /* ignore */ });
}

export function onSpotifyStateChanged(cb: (state: any) => void): () => void {
  if (!activePlayer) return () => { /* noop */ };
  activePlayer.addListener('player_state_changed', cb);
  return () => activePlayer?.removeListener('player_state_changed');
}

// ── Spotify Playlist Import ─────────────────────────────────────────────────
export interface SpotifyPlaylistSummary {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  item_count: number;
  owner: string;
  is_public: boolean;
}

export interface SpotifyPlaylistItem {
  track_id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail_url: string;
  duration_seconds: number;
  external_url: string;
  preview_url: string | null;
}

/** Fetches the user's Spotify playlists via edge function */
export async function getMySpotifyPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const { data, error } = await supabase.functions.invoke('spotify-playlists', {
    body: { action: 'list' },
  });
  if (error) throw new Error(error.message);
  if (data?.needs_reconnect) throw new Error(data.error);
  return data?.playlists ?? [];
}

/** Fetches all tracks in a specific Spotify playlist */
export async function getSpotifyPlaylistItems(playlistId: string): Promise<SpotifyPlaylistItem[]> {
  const { data, error } = await supabase.functions.invoke('spotify-playlists', {
    body: { action: 'items', playlist_id: playlistId },
  });
  if (error) throw new Error(error.message);
  return data?.items ?? [];
}
