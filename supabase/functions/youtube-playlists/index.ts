// Mixd — YouTube Playlist Fetcher
// Lists user's playlists and fetches items for a given playlist.
// Uses the stored YouTube access token (refreshes if expired).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
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

/** Ensure we have a valid access token, refreshing if needed */
async function getValidToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data: conn } = await admin
    .from('youtube_connections')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!conn) return null;

  const expiresAt = new Date(conn.expires_at).getTime();
  const now = Date.now();

  // Still valid (with 2 min buffer)
  if (expiresAt - now > 120_000) return conn.access_token;

  // Need to refresh
  if (!conn.refresh_token) return null;

  const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });

  if (!refreshResp.ok) {
    console.error('YouTube token refresh failed:', await refreshResp.text());
    return null;
  }

  const tokens = await refreshResp.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await admin
    .from('youtube_connections')
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
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
    const accessToken = await getValidToken(admin, userId);
    if (!accessToken) return json({ error: 'YouTube not connected or token expired' }, 401);

    const { action, playlist_id } = await req.json();

    if (action === 'list') {
      // Fetch user's playlists
      const playlists = [];
      let pageToken = '';
      do {
        const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
        url.searchParams.set('part', 'snippet,contentDetails');
        url.searchParams.set('mine', 'true');
        url.searchParams.set('maxResults', '50');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
          const err = await resp.text();
          return json({ error: 'YouTube API error', detail: err }, 502);
        }
        const data = await resp.json();
        for (const item of data.items ?? []) {
          playlists.push({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnail_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            item_count: item.contentDetails?.itemCount ?? 0,
          });
        }
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      // Also add "Liked Videos" (special playlist)
      // YouTube stores liked videos in a special playlist with ID 'LL'
      // but it may not appear in the mine=true listing

      return json({ playlists });
    }

    if (action === 'items' && playlist_id) {
      // Fetch items in a playlist
      const items = [];
      let pageToken = '';
      do {
        const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', playlist_id);
        url.searchParams.set('maxResults', '50');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) {
          const err = await resp.text();
          return json({ error: 'YouTube API error', detail: err }, 502);
        }
        const data = await resp.json();
        for (const item of data.items ?? []) {
          const videoId = item.snippet?.resourceId?.videoId;
          if (!videoId) continue; // Skip deleted videos
          items.push({
            video_id: videoId,
            title: item.snippet.title,
            channel_title: item.snippet.videoOwnerChannelTitle || '',
            thumbnail_url: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            position: item.snippet.position ?? items.length,
          });
        }
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      return json({ items });
    }

    return json({ error: 'Invalid action — use "list" or "items"' }, 400);
  } catch (err) {
    console.error('youtube-playlists error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
