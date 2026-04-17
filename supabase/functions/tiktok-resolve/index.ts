// Mixd — TikTok URL resolver
// Accepts any TikTok URL (including short links like /t/XXXXX) and returns
// the video ID + metadata via TikTok's public oEmbed API.
//
// The oEmbed endpoint follows redirects internally, so short links resolve
// automatically without us needing to follow them manually.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

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
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return json({ error: 'Missing "url" in request body' }, 400);
    }

    // Call TikTok's oEmbed API — handles short links, /t/ links, and full URLs
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const resp = await fetch(oembedUrl);

    if (!resp.ok) {
      return json({ error: `TikTok oEmbed returned ${resp.status}` }, 502);
    }

    const data = await resp.json();

    // The oEmbed response contains an HTML embed snippet with the video ID.
    // Extract the video ID from the data-video-id attribute or the cite URL.
    // cite="https://www.tiktok.com/@user/video/1234567890"
    let videoId: string | null = null;
    const html: string = data.html || '';

    // Try data-video-id attribute
    const dataIdMatch = html.match(/data-video-id="(\d+)"/);
    if (dataIdMatch) {
      videoId = dataIdMatch[1];
    }

    // Fallback: try cite URL
    if (!videoId) {
      const citeMatch = html.match(/cite="[^"]*\/video\/(\d+)"/);
      if (citeMatch) {
        videoId = citeMatch[1];
      }
    }

    // Fallback: try thumbnail_url which often contains the video ID
    if (!videoId && data.thumbnail_url) {
      const thumbMatch = data.thumbnail_url.match(/\/(\d{10,})\//);
      if (thumbMatch) {
        videoId = thumbMatch[1];
      }
    }

    if (!videoId) {
      return json({ error: 'Could not extract video ID from TikTok response' }, 422);
    }

    return json({
      video_id: videoId,
      title: data.title || 'TikTok Video',
      author: data.author_name || 'Unknown',
      author_url: data.author_url || '',
      thumbnail_url: data.thumbnail_url || '',
      thumbnail_width: data.thumbnail_width || 0,
      thumbnail_height: data.thumbnail_height || 0,
    });
  } catch (e) {
    console.error('tiktok-resolve error:', e);
    return json({ error: (e as Error).message }, 500);
  }
});
