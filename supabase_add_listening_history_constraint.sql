-- Muse Analytics: Add unique constraint to listening_history
-- Run this in your Supabase SQL Editor if you already have the listening_history table
-- and are seeing error 42P10 (no unique constraint matching ON CONFLICT specification).
--
-- This migration is idempotent: it checks whether the constraint already exists
-- before attempting to add it.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unique_listening_play'
      and conrelid = 'listening_history'::regclass
  ) then
    alter table listening_history
      add constraint unique_listening_play unique (spotify_id, played_at);
  end if;
end $$;
