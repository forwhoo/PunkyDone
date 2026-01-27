-- Muse Analytics: The Genie Predictor Table
-- Run this in your Supabase SQL Editor to enable AI persistence

create table predictor (
  id bigint generated always as identity primary key,
  date date not null unique default current_date,
  content jsonb not null, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) is recommended
alter table predictor enable row level security;

-- Policy: Allow anyone (authenticated or public) to READ the predictions
create policy "Public read access" on predictor for select using (true);

-- Policy: Allow authenticated users (or the service role) to INSERT/UPDATE
-- Adjust this depending on your auth setup. If you are logging in users, they can generate it.
create policy "Auth insert access" on predictor for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');
create policy "Auth update access" on predictor for update using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Optional: Index on date for faster lookups
create index predictor_date_idx on predictor (date);
