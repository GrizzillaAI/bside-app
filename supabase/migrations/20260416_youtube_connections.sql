-- YouTube connections table — stores OAuth tokens + channel info per user
-- Mirrors the pattern of spotify_connections

CREATE TABLE IF NOT EXISTS public.youtube_connections (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_channel_id text,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz NOT NULL,
  scope         text,
  display_name  text,
  email         text,
  avatar_url    text,
  connected_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can only see their own connection
ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own YouTube connection"
  ON public.youtube_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own YouTube connection"
  ON public.youtube_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role handles insert/update (via edge function)
-- No INSERT/UPDATE policies needed for service role
