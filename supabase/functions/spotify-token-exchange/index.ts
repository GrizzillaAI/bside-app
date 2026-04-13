// Mixd — Spotify OAuth token exchange
// Receives authorization code from the client after user approves on Spotify,
// exchanges it for access + refresh tokens, fetches user profile (to get Premium status),
// and persists into public.spotify_connections keyed on the authenticated Supabase user.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID') ?? '';
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? '';
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

    // Verify JWT and get user
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid auth' }, 401);
    const userId = userData.user.id;

    const { code, redirect_uri, code_verifier } = await req.json();
    if (!code || !redirect_uri) return json({ error: 'Missing code or redirect_uri' }, 400);

    // Exchange authorization code for access + refresh tokens
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
    });
    // PKCE: client_id in body, code_verifier; no client_secret
    // Non-PKCE: Basic auth with client_id:client_secret
    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (code_verifier) {
      tokenBody.set('client_id', SPOTIFY_CLIENT_ID);
      tokenBody.set('code_verifier', code_verifier);
    } else {
      const basic = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
      tokenHeaders['Authorization'] = `Basic ${basic}`;
    }

    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: tokenHeaders,
      body: tokenBody,
    });
    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error('Spotify token exchange failed:', errText);
      return json({ error: 'Spotify token exchange failed', detail: errText }, 502);
    }
    const tokens = await tokenResp.json();
    const accessToken = tokens.access_token as string;
    const refreshToken = tokens.refresh_token as string;
    const expiresIn = tokens.expires_in as number; // seconds
    const scope = tokens.scope as string;

    // Fetch Spotify user profile to get Premium status
    const profileResp = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResp.ok) {
      return json({ error: 'Failed to fetch Spotify profile' }, 502);
    }
    const profile = await profileResp.json();
    const isPremium = profile.product === 'premium';

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Upsert into spotify_connections using service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertErr } = await admin.from('spotify_connections').upsert({
      user_id: userId,
      spotify_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope,
      is_premium: isPremium,
      display_name: profile.display_name ?? null,
      email: profile.email ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (upsertErr) {
      console.error('DB upsert failed:', upsertErr);
      return json({ error: 'DB upsert failed', detail: upsertErr.message }, 500);
    }

    return json({
      ok: true,
      spotify_user_id: profile.id,
      display_name: profile.display_name,
      is_premium: isPremium,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
