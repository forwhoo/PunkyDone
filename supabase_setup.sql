-- Muse Analytics: Supabase Setup
-- Run this in your Supabase SQL Editor

-- Note: The Genie predictor table has been removed
-- If you previously created it, you can drop it with:
-- DROP TABLE IF EXISTS predictor CASCADE;

-- listening_history: stores recently played tracks synced from Spotify
create table if not exists listening_history (
  id bigint generated always as identity primary key,
  spotify_id text not null,
  played_at timestamp with time zone not null,
  track_name text,
  artist_name text,
  album_name text,
  album_cover text,
  duration_ms int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_listening_play unique (spotify_id, played_at)
);

-- Enable RLS
alter table listening_history enable row level security;

-- Allow authenticated users to insert their own history
create policy "User can insert own listening history" on listening_history
  for insert with check (true);

-- Allow users to read
create policy "User can read own listening history" on listening_history
  for select using (true);

-- Indexes for performance
create index if not exists idx_lh_played_at on listening_history(played_at);
create index if not exists idx_lh_artist on listening_history(artist_name);
