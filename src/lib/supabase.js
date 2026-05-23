import { createClient } from '@supabase/supabase-js'

// Users provide their own free Supabase project
// env vars set in Netlify/Vercel dashboard
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null

export const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_KEY)

// SQL to run once in Supabase SQL editor:
export const SUPABASE_SCHEMA = `
-- Rooms table
create table if not exists arena_rooms (
  id text primary key,
  host_name text not null,
  questions jsonb not null,
  status text default 'waiting',
  current_q int default 0,
  time_per_q int default 30,
  created_at timestamptz default now()
);

-- Players table  
create table if not exists arena_players (
  id uuid primary key default gen_random_uuid(),
  room_id text references arena_rooms(id) on delete cascade,
  name text not null,
  score int default 0,
  answers jsonb default '[]',
  joined_at timestamptz default now()
);

-- Match history
create table if not exists arena_history (
  id uuid primary key default gen_random_uuid(),
  room_id text,
  players jsonb,
  questions_count int,
  played_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table arena_rooms;
alter publication supabase_realtime add table arena_players;

-- Row level security (open for demo)
alter table arena_rooms enable row level security;
alter table arena_players enable row level security;
alter table arena_history enable row level security;
create policy "public_access" on arena_rooms for all using (true) with check (true);
create policy "public_access" on arena_players for all using (true) with check (true);
create policy "public_access" on arena_history for all using (true) with check (true);
`
