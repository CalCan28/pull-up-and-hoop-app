-- Pull Up & Hoop — Full Mobile App Schema
-- Run this in your Supabase SQL editor

-- ============================================
-- COURTS
-- ============================================
create table courts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  surface_type text default 'asphalt' check (surface_type in ('asphalt', 'concrete', 'hardwood', 'sport-court')),
  image_url text,
  created_at timestamptz default now()
);

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  position text check (position in ('PG', 'SG', 'SF', 'PF', 'C', null)),
  height text,
  created_at timestamptz default now()
);

-- ============================================
-- CHECK-INS (who's at a court right now)
-- ============================================
create table check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  court_id uuid references courts(id) on delete cascade not null,
  checked_in_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '3 hours'),
  is_active boolean default true
);

-- ============================================
-- QUEUE — "I Got Next" system
-- ============================================
create table queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  court_id uuid references courts(id) on delete cascade not null,
  position integer not null,
  status text default 'waiting' check (status in ('waiting', 'playing', 'done')),
  joined_at timestamptz default now()
);

-- ============================================
-- GAMES — a pickup game session
-- ============================================
create table games (
  id uuid default gen_random_uuid() primary key,
  court_id uuid references courts(id) on delete cascade not null,
  game_type text default '5v5' check (game_type in ('5v5', '3v3', '21', '1v1')),
  status text default 'picking' check (status in ('picking', 'active', 'finished')),
  created_by uuid references auth.users(id) on delete set null,
  scorekeeper_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- GAME PLAYERS — who's on which team
-- ============================================
create table game_players (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  team integer check (team in (1, 2)) not null,
  is_captain boolean default false,
  unique(game_id, user_id)
);

-- ============================================
-- GAME STATS — stats for a single game
-- ============================================
create table game_stats (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  reported_by uuid references auth.users(id) on delete set null not null,
  points integer default 0,
  assists integer default 0,
  rebounds integer default 0,
  steals integer default 0,
  blocks integer default 0,
  three_pointers integer default 0,
  created_at timestamptz default now(),
  unique(game_id, user_id, reported_by)
);

-- ============================================
-- STAT VOUCHES — players confirm each other's stats
-- ============================================
create table stat_vouches (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  stat_owner_id uuid references auth.users(id) on delete cascade not null,
  voucher_id uuid references auth.users(id) on delete cascade not null,
  approved boolean not null,
  created_at timestamptz default now(),
  unique(game_id, stat_owner_id, voucher_id)
);

-- ============================================
-- VERIFIED STATS — finalized stats after vouching
-- ============================================
create table verified_stats (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  court_id uuid references courts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  points integer default 0,
  assists integer default 0,
  rebounds integer default 0,
  steals integer default 0,
  blocks integer default 0,
  three_pointers integer default 0,
  verified_at timestamptz default now(),
  unique(game_id, user_id)
);

-- ============================================
-- SCORE EVENTS — live play-by-play scoring from sideline
-- ============================================
create table score_events (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  player_id uuid references auth.users(id) on delete cascade not null,
  team integer check (team in (1, 2)) not null,
  score_type text not null check (score_type in ('2pt', '3pt', 'ft')),
  points integer not null check (points in (1, 2, 3)),
  recorded_by uuid references auth.users(id) on delete set null not null,
  created_at timestamptz default now()
);

-- ============================================
-- PICKUP SESSIONS — user-hosted temporary runs
-- ============================================
create table pickup_sessions (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users(id) on delete cascade not null,
  location_name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  game_type text default 'open' check (game_type in ('5v5', '3v3', '1v1', 'open')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  max_players integer,
  description text,
  status text default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  created_at timestamptz default now()
);

-- ============================================
-- COURT RATINGS
-- ============================================
create table ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  court_id uuid references courts(id) on delete cascade not null,
  hoop_quality integer check (hoop_quality between 1 and 5) not null,
  court_condition integer check (court_condition between 1 and 5) not null,
  competition integer check (competition between 1 and 5) not null,
  comment text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_check_ins_court on check_ins(court_id);
create index idx_check_ins_active on check_ins(is_active, expires_at);
create index idx_queue_court on queue(court_id, status);
create index idx_games_court on games(court_id, status);
create index idx_game_players_game on game_players(game_id);
create index idx_game_stats_game on game_stats(game_id, user_id);
create index idx_stat_vouches_game on stat_vouches(game_id, stat_owner_id);
create index idx_verified_stats_user on verified_stats(user_id);
create index idx_verified_stats_court on verified_stats(court_id, user_id);
create index idx_pickup_sessions_status on pickup_sessions(status, start_time);
create index idx_pickup_sessions_location on pickup_sessions(lat, lng);
create index idx_ratings_court on ratings(court_id);
create index idx_score_events_game on score_events(game_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table courts enable row level security;
alter table profiles enable row level security;
alter table check_ins enable row level security;
alter table queue enable row level security;
alter table games enable row level security;
alter table game_players enable row level security;
alter table game_stats enable row level security;
alter table stat_vouches enable row level security;
alter table verified_stats enable row level security;
alter table ratings enable row level security;
alter table score_events enable row level security;
alter table pickup_sessions enable row level security;

-- Courts: public read, auth write
create policy "Courts readable by all" on courts for select using (true);
create policy "Auth users can add courts" on courts for insert with check (auth.role() = 'authenticated');

-- Profiles: public read, owner write
create policy "Profiles readable by all" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Check-ins: public read, owner write
create policy "Check-ins readable by all" on check_ins for select using (true);
create policy "Users insert own check-ins" on check_ins for insert with check (auth.uid() = user_id);
create policy "Users update own check-ins" on check_ins for update using (auth.uid() = user_id);

-- Queue: public read, owner write
create policy "Queue readable by all" on queue for select using (true);
create policy "Users join queue" on queue for insert with check (auth.uid() = user_id);
create policy "Users update own queue" on queue for update using (auth.uid() = user_id);

-- Games: public read, auth write
create policy "Games readable by all" on games for select using (true);
create policy "Auth users create games" on games for insert with check (auth.role() = 'authenticated');
create policy "Game creator can update" on games for update using (auth.uid() = created_by);

-- Game players: public read, auth write
create policy "Game players readable by all" on game_players for select using (true);
create policy "Auth users join games" on game_players for insert with check (auth.role() = 'authenticated');

-- Game stats: public read, auth write
create policy "Game stats readable by all" on game_stats for select using (true);
create policy "Auth users report stats" on game_stats for insert with check (auth.uid() = reported_by);

-- Stat vouches: public read, auth write
create policy "Vouches readable by all" on stat_vouches for select using (true);
create policy "Auth users can vouch" on stat_vouches for insert with check (auth.uid() = voucher_id);

-- Verified stats: public read only (system writes via function)
create policy "Verified stats readable by all" on verified_stats for select using (true);
create policy "System inserts verified stats" on verified_stats for insert with check (auth.role() = 'authenticated');

-- Score events: public read, auth write + delete own
create policy "Score events readable by all" on score_events for select using (true);
create policy "Auth users record scores" on score_events for insert with check (auth.uid() = recorded_by);
create policy "Recorder can undo scores" on score_events for delete using (auth.uid() = recorded_by);

-- Pickup sessions: public read, owner write/update
create policy "Pickup sessions readable by all" on pickup_sessions for select using (true);
create policy "Auth users create pickup sessions" on pickup_sessions for insert with check (auth.uid() = created_by);
create policy "Creator can update pickup session" on pickup_sessions for update using (auth.uid() = created_by);
create policy "Creator can delete pickup session" on pickup_sessions for delete using (auth.uid() = created_by);

-- Ratings: public read, owner write
create policy "Ratings readable by all" on ratings for select using (true);
create policy "Users insert own ratings" on ratings for insert with check (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Expire old check-ins
create or replace function expire_check_ins()
returns void as $$
begin
  update check_ins set is_active = false where expires_at < now() and is_active = true;
end;
$$ language plpgsql;

-- Verify stats when majority vouch (called after each vouch insert)
create or replace function process_stat_verification()
returns trigger as $$
declare
  total_players integer;
  approve_count integer;
  reject_count integer;
  majority_needed integer;
  stat_record record;
begin
  -- Count players in the game (excluding the stat owner)
  select count(*) into total_players
  from game_players
  where game_id = new.game_id and user_id != new.stat_owner_id;

  -- Majority needed
  majority_needed := ceil(total_players::numeric / 2);

  -- Count approvals
  select count(*) into approve_count
  from stat_vouches
  where game_id = new.game_id and stat_owner_id = new.stat_owner_id and approved = true;

  -- If majority approved, calculate median stats and insert verified
  if approve_count >= majority_needed then
    -- Check if already verified
    if not exists (select 1 from verified_stats where game_id = new.game_id and user_id = new.stat_owner_id) then
      -- Use the stat owner's own reported stats (already vouched by majority)
      select
        coalesce(avg(points), 0)::integer as points,
        coalesce(avg(assists), 0)::integer as assists,
        coalesce(avg(rebounds), 0)::integer as rebounds,
        coalesce(avg(steals), 0)::integer as steals,
        coalesce(avg(blocks), 0)::integer as blocks,
        coalesce(avg(three_pointers), 0)::integer as three_pointers
      into stat_record
      from game_stats
      where game_id = new.game_id and user_id = new.stat_owner_id;

      insert into verified_stats (game_id, court_id, user_id, points, assists, rebounds, steals, blocks, three_pointers)
      select
        new.game_id,
        g.court_id,
        new.stat_owner_id,
        stat_record.points,
        stat_record.assists,
        stat_record.rebounds,
        stat_record.steals,
        stat_record.blocks,
        stat_record.three_pointers
      from games g where g.id = new.game_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_stat_vouch_inserted
  after insert on stat_vouches
  for each row execute procedure process_stat_verification();

-- View: player career stats
create or replace view player_career_stats as
select
  user_id,
  count(*) as games_played,
  round(avg(points), 1) as ppg,
  round(avg(assists), 1) as apg,
  round(avg(rebounds), 1) as rpg,
  round(avg(steals), 1) as spg,
  round(avg(blocks), 1) as bpg,
  round(avg(three_pointers), 1) as tpg,
  sum(points) as total_points,
  sum(assists) as total_assists,
  sum(rebounds) as total_rebounds
from verified_stats
group by user_id;

-- View: player stats per court
create or replace view player_court_stats as
select
  user_id,
  court_id,
  count(*) as games_played,
  round(avg(points), 1) as ppg,
  round(avg(assists), 1) as apg,
  round(avg(rebounds), 1) as rpg,
  round(avg(steals), 1) as spg,
  round(avg(blocks), 1) as bpg
from verified_stats
group by user_id, court_id;
