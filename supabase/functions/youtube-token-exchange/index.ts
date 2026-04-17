// Mixd — YouTube/Google OAuth token exchange
// Receives authorization code from the client after user approves on Google,
// exchanges it for access + refresh tokens, fetches YouTube channel info,
// and persists into public.youtube_connections keyed on the authenticated Supabase user.
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

    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) return json({ error: 'Missing code or redirect_uri' }, 400);

    // Exchange authorization code for tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error('Google token exchange failed:', errText);
      return json({ error: 'Google token exchange failed', detail: errText }, 502);
    }

    const tokens = await tokenResp.json();
    const accessToken = tokens.access_token as string;
    const refreshToken = tokens.refresh_token as string | undefined;
    const expiresIn = tokens.expires_in as number;
    const scope = tokens.scope as string;

    // Fetch Google user profile
    const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileResp.ok ? await profileResp.json() : {};

    // Fetch YouTube channel info
    const channelResp = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    let channelId: string | null = null;
    let channelTitle: string | null = null;
    let channelAvatar: string | null = null;
    if (channelResp.ok) {
      const channelData = await channelResp.json();
      const ch = channelData.items?.[0];
      if (ch) {
        channelId = ch.id;
        channelTitle = ch.snippet?.title ?? null;
        channelAvatar = ch.snippet?.thumbnails?.default?.url ?? null;
      }
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const now = new Date().toISOString();

    // Upsert into youtube_connections using service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build row — only include refresh_token if Google returned one
    // (Google only returns it on initial consent, not on re-auth)
    const row: Record<string, unknown> = {
      user_id: userId,
      youtube_channel_id: channelId,
      access_token: accessToken,
      expires_at: expiresAt,
      scope,
      display_name: channelTitle ?? profile.name ?? null,
      email: profile.email ?? null,
      avatar_url: channelAvatar ?? profile.picture ?? null,
      updated_at: now,
    };
    if (refreshToken) {
      row.refresh_token = refreshToken;
    }

    const { error: upsertErr } = await admin.from('youtube_connections').upsert(row, {
      onConflict: 'user_id',
    });
    if (upsertErr) {
      console.error('DB upsert failed:', upsertErr);
      return json({ error: 'DB upsert failed', detail: upsertErr.message }, 500);
    }

    return json({
      ok: true,
      youtube_channel_id: channelId,
      display_name: channelTitle ?? profile.name,
      email: profile.email,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
