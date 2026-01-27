-- Muse Analytics: Extended History Migration
-- Use this to create the staging table for large imports

create table if not exists extended_streaming_history (
  id bigint generated always as identity primary key,
  ts timestamp with time zone not null,
  username text,
  platform text,
  ms_played int,
  conn_country text,
  ip_addr_decrypted text,
  user_agent_decrypted text,
  master_metadata_track_name text,
  master_metadata_album_artist_name text,
  master_metadata_album_album_name text,
  spotify_track_uri text,
  episode_name text,
  episode_show_name text,
  spotify_episode_uri text,
  reason_start text,
  reason_end text,
  shuffle boolean,
  skipped boolean,
  offline boolean,
  offline_timestamp bigint,
  incognito_mode boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table extended_streaming_history enable row level security;

-- Allow authenticated users to insert their own history
create policy "User can insert own extended history" on extended_streaming_history
  for insert with check (true); 
  -- In a real app, you would check auth.uid() if you store it, but for now we allow insert

-- Allow users to read (for progress checks)
create policy "User can read own extended history" on extended_streaming_history
  for select using (true);
  
-- Create Index on TS for faster merging
create index if not exists idx_extended_ts on extended_streaming_history(ts);
create index if not exists idx_extended_artist on extended_streaming_history(master_metadata_album_artist_name);

-- Add unique constraint to prevent duplicates in the staging table
alter table extended_streaming_history add constraint unique_ts_track unique (ts, master_metadata_track_name);

-- Helper Function to Migrate Data to Main Table
-- Call this after upload is complete
create or replace function migrate_extended_history()
returns void as $$
begin
  -- Insert valid music plays (longer than 30s, has track name)
  insert into listening_history (
    spotify_id,
    played_at,
    track_name,
    artist_name,
    album_name,
    album_cover, -- We don't have cover in extended history, leave empty or handle later
    duration_ms,
    user_timezone
  )
  select
    distinct on (ts, master_metadata_track_name) -- Avoid duplicates in source
    coalesce(spotify_track_uri, 'unknown'),
    ts,
    master_metadata_track_name,
    master_metadata_album_artist_name,
    master_metadata_album_album_name,
    '', -- No cover in JSON
    ms_played,
    'UTC'
  from extended_streaming_history
  where 
    master_metadata_track_name is not null 
    and ms_played > 30000 
    and spotify_track_uri is not null
  on conflict (played_at) do nothing;
end;
$$ language plpgsql;
