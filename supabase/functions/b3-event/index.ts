// Mixd — B3 Event Backbone: log events to b3_events table
// This edge function inserts events using the service role key,
// since b3_events is not accessible from the client (RLS: service role only).
//
// Called fire-and-forget from the client for app-code events:
// - search.performed
// - playlist.created
//
// DB triggers already handle: user.signup, play.*, track.liked/disliked, track.saved, spotify.connected

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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
    // Authenticate the caller — get their Supabase user ID from the JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) return json({ error: 'Missing authorization' }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Invalid auth' }, 401);
    const userId = userData.user.id;

    const { event_type, properties } = await req.json();
    if (!event_type) return json({ error: 'Missing event_type' }, 400);

    // Allowlist — accept all app-code events the client sends
    const ALLOWED_EVENTS = [
      'search.performed', 'playlist.created',
      'play.started', 'play.completed', 'play.skipped',
      'track.saved',
    ];
    if (!ALLOWED_EVENTS.includes(event_type)) {
      return json({ error: `Event type '${event_type}' not allowed` }, 400);
    }

    // Insert into b3_events using service role (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: insertErr } = await admin.from('b3_events').insert({
      event_type,
      user_id: userId,
      product: 'bside',
      properties: properties ?? {},
      occurred_at: new Date().toISOString(),
      b3_synced: false,
    });

    if (insertErr) {
      console.error('b3_events insert failed:', insertErr);
      return json({ error: 'Event insert failed', detail: insertErr.message }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('b3-event error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
