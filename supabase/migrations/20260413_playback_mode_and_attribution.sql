-- Playback Mode + Creator Attribution enhancements
-- Adds:
--   1. profiles.preferred_playback_mode — per-user default (watch | listen)
--   2. play_events enrichments — mode, device_state, event_type columns for
--      attribution tracking, including skipped-on-lock entries
-- ----------------------------------------------------------------------------

-- 1. preferred_playback_mode on profiles -------------------------------------
alter table public.profiles
  add column if not exists preferred_playback_mode text
    check (preferred_playback_mode in ('watch', 'listen'))
    default 'watch';

comment on column public.profiles.preferred_playback_mode is
  'User''s default playback mode. Watch = video plays when available. Listen = audio-first with YouTube auto-skip on locked screen.';

-- 2. Enrich play_events for attribution --------------------------------------
-- If the table doesn''t yet exist (fresh install), create it here so this
-- migration is self-contained. If it exists, we just add the new columns.

create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  track_id text,
  source_platform text not null,
  source_id text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.play_events
  add column if not exists event_type text
    check (event_type in ('full_play', 'partial_play', 'skipped_on_lock', 'user_skipped'))
    default 'full_play';

alter table public.play_events
  add column if not exists playback_mode text
    check (playback_mode in ('watch', 'listen'));

alter table public.play_events
  add column if not exists device_state text
    check (device_state in ('foreground', 'background', 'locked'));

-- Index for creator analytics queries
create index if not exists play_events_source_idx
  on public.play_events (source_platform, source_id, occurred_at desc);

create index if not exists play_events_user_idx
  on public.play_events (user_id, occurred_at desc);

-- RLS on play_events: users can insert their own events and read their own.
-- Creators (future) read aggregate counts via a view, not this table directly.
alter table public.play_events enable row level security;

drop policy if exists "users insert own play events" on public.play_events;
create policy "users insert own play events"
  on public.play_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users read own play events" on public.play_events;
create policy "users read own play events"
  on public.play_events
  for select
  using (auth.uid() = user_id);

-- Allow anonymous inserts with null user_id for non-authed plays (rare, but
-- keeps the attribution pipeline from breaking if a track gets played
-- pre-signin — e.g., landing page preview).
drop policy if exists "anon can insert unauthed play events" on public.play_events;
create policy "anon can insert unauthed play events"
  on public.play_events
  for insert
  with check (user_id is null);

comment on column public.play_events.event_type is
  'full_play: track completed. partial_play: user stopped mid-track. skipped_on_lock: auto-skipped because Listen mode + locked screen + video-only source. user_skipped: user manually skipped.';
comment on column public.play_events.playback_mode is
  'Which mode was active when the event occurred.';
comment on column public.play_events.device_state is
  'Device state at the moment of the event. Useful for creator attribution — skipped_on_lock events should have device_state = background or locked.';
