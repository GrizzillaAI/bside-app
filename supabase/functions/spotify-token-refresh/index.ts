// Mixd — Spotify access token refresh
// Called by the client when the cached access token is within 2 minutes of expiry.
// Uses the stored refresh_token, trades it for a new access_token, updates the DB row,
// and returns the fresh access_token + expiry to the client.
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Missing authorization' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid auth' }, 401);
    const userId = userData.user.id;

    // Load stored refresh_token
    const { data: conn, error: connErr } = await admin
      .from('spotify_connections')
      .select('refresh_token, expires_at, is_premium, spotify_user_id, display_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (connErr) return json({ error: connErr.message }, 500);
    if (!conn) return json({ error: 'No Spotify connection found' }, 404);

    // PKCE-compatible refresh: client_id in body, NO client_secret / Basic auth.
    // Token was originally obtained via PKCE flow, so refresh must match.
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
      console.error('Spotify refresh failed:', errText);
      // If refresh token is invalid, the user has to reconnect
      if (refreshResp.status === 400 || refreshResp.status === 401) {
        return json({ error: 'REFRESH_INVALID', detail: errText }, 401);
      }
      return json({ error: 'Spotify refresh failed', detail: errText }, 502);
    }
    const tokens = await refreshResp.json();
    const accessToken = tokens.access_token as string;
    const expiresIn = tokens.expires_in as number;
    // Spotify may or may not return a new refresh_token
    const newRefreshToken = (tokens.refresh_token as string | undefined) ?? conn.refresh_token;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateErr } = await admin
      .from('spotify_connections')
      .update({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({
      ok: true,
      access_token: accessToken,
      expires_at: expiresAt,
      is_premium: conn.is_premium,
      spotify_user_id: conn.spotify_user_id,
      display_name: conn.display_name,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
