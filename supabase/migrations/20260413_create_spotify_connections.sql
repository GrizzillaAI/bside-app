-- Mixd — spotify_connections table
-- Stores per-user OAuth tokens + Premium status for Spotify Web Playback SDK access.
-- RLS ensures each user can only read/modify their own row.
-- (Already applied to Supabase project qzatxnogsiluxmflgfgy — kept here for version history.)

create table if not exists public.spotify_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  spotify_user_id text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  is_premium boolean default false,
  display_name text,
  email text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update `updated_at` on row change
create or replace function public.spotify_connections_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_spotify_connections_updated_at on public.spotify_connections;
create trigger trg_spotify_connections_updated_at
  before update on public.spotify_connections
  for each row execute function public.spotify_connections_set_updated_at();

-- Row-level security: users only see their own row
alter table public.spotify_connections enable row level security;

drop policy if exists "select own spotify connection" on public.spotify_connections;
create policy "select own spotify connection"
  on public.spotify_connections for select
  using (auth.uid() = user_id);

drop policy if exists "insert own spotify connection" on public.spotify_connections;
create policy "insert own spotify connection"
  on public.spotify_connections for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own spotify connection" on public.spotify_connections;
create policy "update own spotify connection"
  on public.spotify_connections for update
  using (auth.uid() = user_id);

drop policy if exists "delete own spotify connection" on public.spotify_connections;
create policy "delete own spotify connection"
  on public.spotify_connections for delete
  using (auth.uid() = user_id);
