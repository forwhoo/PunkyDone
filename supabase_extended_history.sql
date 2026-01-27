-- Muse Analytics: Extended History Migration
-- Stores historical data in the application's native format

create table if not exists extended_streaming_history (
  id bigint generated always as identity primary key,
  played_at timestamp with time zone not null, -- Mapped from 'ts'
  track_name text,                             -- Mapped from 'master_metadata_track_name'
  artist_name text,                            -- Mapped from 'master_metadata_album_artist_name'
  album_name text,                             -- Mapped from 'master_metadata_album_album_name'
  spotify_id text,                             -- Mapped from 'spotify_track_uri'
  duration_ms int,                             -- Mapped from 'ms_played'
  album_cover text default null,               -- Left empty for JSON imports
  user_timezone text default 'UTC',
  
  -- Raw/Extra fields we might want to keep just in case, but distinct from core logic
  platform text,
  conn_country text,
  ip_addr_decrypted text,
  reason_start text,
  reason_end text,
  shuffle boolean,
  skipped boolean,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table extended_streaming_history enable row level security;

-- Allow authenticated users to insert their own history
create policy "User can insert own extended history" on extended_streaming_history
  for insert with check (true); 

-- Allow users to read
create policy "User can read own extended history" on extended_streaming_history
  for select using (true);
  
-- Indexes for performance
create index if not exists idx_ext_played_at on extended_streaming_history(played_at);
create index if not exists idx_ext_artist on extended_streaming_history(artist_name);

-- Unique constraint to prevent duplicates (same track at exact same time)
alter table extended_streaming_history add constraint unique_extended_play unique (played_at, track_name);

-- NOTE: No migration function needed anymore if we treat this as a parallel source
-- But if you ever want to merge them:
-- insert into listening_history (...) select ... from extended_streaming_history

