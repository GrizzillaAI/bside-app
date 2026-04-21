// Mixd — Spotify Playlist Fetcher
// Lists user's playlists and fetches items for a given playlist.
// Uses the stored Spotify access token (PKCE-compatible refresh).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Ensure we have a valid Spotify access token, refreshing if needed */
async function getValidToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ token: string } | { error: string; needs_reconnect?: boolean }> {
  const { data: conn } = await admin
    .from('spotify_connections')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!conn) return { error: 'No Spotify connection found' };

  const expiresAt = new Date(conn.expires_at).getTime();
  const now = Date.now();

  // Still valid (with 2 min buffer)
  if (expiresAt - now > 120_000) return { token: conn.access_token };

  // Need to refresh
  if (!conn.refresh_token) {
    return { error: 'No refresh token — please reconnect Spotify', needs_reconnect: true };
  }

  // PKCE-compatible refresh: client_id in body, NO client_secret / Basic auth.
  // The token was originally obtained via PKCE flow, so the refresh MUST match.
  const refreshResp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });

  if (!refreshResp.ok) {
    const errText = await refreshResp.text();
    console.error('Spotify token refresh failed:', errText);
    if (refreshResp.status === 400 || refreshResp.status === 401) {
      return { error: 'Spotify session expired — please reconnect', needs_reconnect: true };
    }
    return { error: `Spotify refresh failed: ${errText}` };
  }

  const tokens = await refreshResp.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await admin
    .from('spotify_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return { token: tokens.access_token };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Missing authorization' }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid auth' }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const tokenResult = await getValidToken(admin, userId);

    if ('error' in tokenResult) {
      const status = tokenResult.needs_reconnect ? 200 : 401;
      return json({
        error: tokenResult.error,
        needs_reconnect: tokenResult.needs_reconnect ?? false,
      }, status);
    }

    const accessToken = tokenResult.token;
    const { action, playlist_id } = await req.json();

    if (action === 'list') {
      // Fetch user's playlists (paginated — Spotify max 50 per page)
      const playlists: Array<{
        id: string;
        title: string;
        description: string;
        thumbnail_url: string;
        item_count: number;
        owner: string;
        is_public: boolean;
      }> = [];

      let url: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';
      while (url) {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
          const err = await resp.text();
          console.error('Spotify playlists API error:', resp.status, err);
          if (resp.status === 403) {
            return json({
              error: 'Spotify access denied — please reconnect with playlist permissions',
              needs_reconnect: true,
            });
          }
          return json({ error: 'Spotify API error', detail: err }, 502);
        }
        const data = await resp.json();
        for (const item of data.items ?? []) {
          if (!item) continue;
          playlists.push({
            id: item.id,
            title: item.name ?? 'Untitled',
            description: item.description ?? '',
            thumbnail_url: item.images?.[0]?.url ?? '',
            item_count: item.tracks?.total ?? 0,
            owner: item.owner?.display_name ?? '',
            is_public: item.public ?? false,
          });
        }
        url = data.next ?? null; // Spotify provides full URL for next page
      }

      return json({ playlists });
    }

    if (action === 'items' && playlist_id) {
      // Fetch all tracks in a playlist.
      // Strategy: first try GET /playlists/{id} (full object with inline tracks),
      // which may succeed where /playlists/{id}/tracks returns 403 in Spotify's
      // development mode API restrictions.
      const items: Array<{
        track_id: string;
        title: string;
        artist: string;
        album: string;
        thumbnail_url: string;
        duration_seconds: number;
        external_url: string;
        preview_url: string | null;
      }> = [];

      // Helper to extract track items from response data
      function extractTracks(entries: any[]) {
        for (const entry of entries) {
          if (!entry || !entry.track || !entry.track.id) continue;
          const track = entry.track;
          items.push({
            track_id: track.id,
            title: track.name ?? 'Unknown',
            artist: (track.artists ?? []).map((a: any) => a.name).join(', ') || 'Unknown Artist',
            album: track.album?.name ?? '',
            thumbnail_url: track.album?.images?.[0]?.url ?? '',
            duration_seconds: Math.round((track.duration_ms ?? 0) / 1000),
            external_url: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
            preview_url: track.preview_url ?? null,
          });
        }
      }

      // Attempt 1: GET /playlists/{id} — returns full playlist with inline tracks
      const playlistResp = await fetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlist_id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (playlistResp.ok) {
        const playlist = await playlistResp.json();
        const tracksObj = playlist.tracks;

        // DIAGNOSTIC: return shape info so we can debug empty results
        const diag = {
          has_tracks_key: 'tracks' in playlist,
          tracks_type: typeof playlist.tracks,
          tracks_total: tracksObj?.total ?? 'N/A',
          tracks_items_length: tracksObj?.items?.length ?? 0,
          first_item_keys: tracksObj?.items?.[0] ? Object.keys(tracksObj.items[0]) : [],
          first_item_track_keys: tracksObj?.items?.[0]?.track ? Object.keys(tracksObj.items[0].track) : [],
          first_item_track_id: tracksObj?.items?.[0]?.track?.id ?? null,
          first_item_track_name: tracksObj?.items?.[0]?.track?.name ?? null,
          playlist_keys: Object.keys(playlist),
        };

        if (tracksObj?.items) {
          extractTracks(tracksObj.items);
          // Paginate if more tracks exist
          let nextUrl: string | null = tracksObj.next ?? null;
          while (nextUrl) {
            const pageResp = await fetch(nextUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!pageResp.ok) break;
            const pageData = await pageResp.json();
            extractTracks(pageData.items ?? []);
            nextUrl = pageData.next ?? null;
          }
        }

        // If Spotify says there are tracks but we extracted 0, report diagnostic as error
        if (items.length === 0 && (tracksObj?.total ?? 0) > 0) {
          return json({
            error: `Spotify returned ${tracksObj.total} tracks but extraction got 0. Diag: ${JSON.stringify(diag)}`,
          });
        }

        return json({ items, _diag: diag });
      }

      // Attempt 2: fall back to /playlists/{id}/tracks (in case the above fails differently)
      const tracksResp = await fetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlist_id)}/tracks?limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!tracksResp.ok) {
        const err = await tracksResp.text();
        // Both approaches failed — report the error
        const playlistErr = await playlistResp.text().catch(() => '');
        return json({
          error: `Spotify API error (${tracksResp.status}): ${err}. Playlist endpoint (${playlistResp.status}): ${playlistErr}`,
        });
      }
      const tracksData = await tracksResp.json();
      extractTracks(tracksData.items ?? []);
      let nextUrl: string | null = tracksData.next ?? null;
      while (nextUrl) {
        const pageResp = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!pageResp.ok) break;
        const pageData = await pageResp.json();
        extractTracks(pageData.items ?? []);
        nextUrl = pageData.next ?? null;
      }

      return json({ items });
    }

    return json({ error: 'Invalid action — use "list" or "items"' }, 400);
  } catch (err) {
    console.error('spotify-playlists error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
