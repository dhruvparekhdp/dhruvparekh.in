-- ─── LUCKY NUMBER LOTTERY · SUPABASE SCHEMA ─────────────────────
-- Shares the same Supabase project as Saloni Collection.
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- Admin = any Supabase Auth user (same email/password you use for
-- the Saloni admin). Players are rows in lottery_players, managed
-- by the admin; their passwords are bcrypt-hashed and all money
-- movement happens inside SECURITY DEFINER functions so the public
-- anon key can never mint credits or bet on a closed match.

create extension if not exists pgcrypto;

-- 1. TABLES ------------------------------------------------------

create table if not exists lottery_players (
  username      text primary key,
  password_hash text not null,
  credits       integer not null default 0 check (credits >= 0),
  created_at    timestamptz not null default now()
);

create table if not exists lottery_matches (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  status         text not null default 'open' check (status in ('open','closed','settled')),
  winning_number integer check (winning_number between 0 and 9),
  total_paid     integer not null default 0,
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);

create table if not exists lottery_bets (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references lottery_matches(id) on delete cascade,
  username   text not null references lottery_players(username) on delete cascade on update cascade,
  number     integer not null check (number between 0 and 9),
  stake      integer not null check (stake >= 1),
  status     text not null default 'pending' check (status in ('pending','won','lost')),
  payout     integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lottery_bets_match_idx on lottery_bets (match_id);
create index if not exists lottery_bets_user_idx  on lottery_bets (username);

-- 2. ROW LEVEL SECURITY ------------------------------------------

alter table lottery_players enable row level security;
alter table lottery_matches enable row level security;
alter table lottery_bets    enable row level security;

-- (drop before create so this whole file is safe to re-run)

-- players: admin only (contains password hashes; players use RPCs)
drop policy if exists "auth_all_players" on lottery_players;
create policy "auth_all_players" on lottery_players
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- matches: anyone can read; only admin writes
drop policy if exists "public_read_matches" on lottery_matches;
create policy "public_read_matches" on lottery_matches
  for select using (true);
drop policy if exists "auth_insert_matches" on lottery_matches;
create policy "auth_insert_matches" on lottery_matches
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "auth_update_matches" on lottery_matches;
create policy "auth_update_matches" on lottery_matches
  for update using (auth.role() = 'authenticated');
drop policy if exists "auth_delete_matches" on lottery_matches;
create policy "auth_delete_matches" on lottery_matches
  for delete using (auth.role() = 'authenticated');

-- bets: anyone can read (bet history); inserts happen only inside
-- the lottery_place_bet function, updates only inside settle
drop policy if exists "public_read_bets" on lottery_bets;
create policy "public_read_bets" on lottery_bets
  for select using (true);
drop policy if exists "auth_delete_bets" on lottery_bets;
create policy "auth_delete_bets" on lottery_bets
  for delete using (auth.role() = 'authenticated');

-- 3. FUNCTIONS ---------------------------------------------------

-- Player login: returns the player row when credentials match,
-- zero rows otherwise.
create or replace function lottery_login(p_username text, p_password text)
returns table (username text, credits integer)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select p.username, p.credits
    from lottery_players p
    where p.username = p_username
      and p.password_hash = crypt(p_password, p.password_hash);
end $$;

-- Admin creates a player (bcrypt-hashes the password).
create or replace function lottery_create_player(
  p_username text, p_password text, p_credits integer default 0)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Admin only';
  end if;
  if p_username is null or p_username !~ '^[a-z0-9_]{2,20}$' then
    raise exception 'Username: 2-20 chars, lowercase letters/numbers/underscore';
  end if;
  if p_password is null or length(p_password) < 1 then
    raise exception 'Password is required';
  end if;
  begin
    insert into lottery_players (username, password_hash, credits)
    values (p_username, crypt(p_password, gen_salt('bf')),
            greatest(coalesce(p_credits, 0), 0));
  exception when unique_violation then
    raise exception 'Username already exists';
  end;
end $$;

-- Player places a bet: verifies password, checks the match is open
-- and the balance covers the stake, then deducts credits and
-- records the bet atomically. Returns the new credit balance.
create or replace function lottery_place_bet(
  p_username text, p_password text, p_match_id uuid,
  p_number integer, p_stake integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_player lottery_players%rowtype;
  v_status text;
begin
  select * into v_player from lottery_players
    where lottery_players.username = p_username for update;
  if not found or v_player.password_hash <> crypt(p_password, v_player.password_hash) then
    raise exception 'Invalid credentials — please log in again';
  end if;

  select status into v_status from lottery_matches where id = p_match_id;
  if not found or v_status <> 'open' then
    raise exception 'That match is not open for betting';
  end if;

  if p_number is null or p_number < 0 or p_number > 9 then
    raise exception 'Pick a number from 0 to 9';
  end if;
  if p_stake is null or p_stake < 1 then
    raise exception 'Stake must be at least 1 credit';
  end if;
  if v_player.credits < p_stake then
    raise exception 'Not enough credits — you have %', v_player.credits;
  end if;

  update lottery_players set credits = credits - p_stake
    where lottery_players.username = p_username;
  insert into lottery_bets (match_id, username, number, stake)
    values (p_match_id, p_username, p_number, p_stake);
  return v_player.credits - p_stake;
end $$;

-- Admin settles a match: marks bets won/lost, pays winners 9x their
-- stake, closes the match. Returns the total paid out.
create or replace function lottery_settle_match(
  p_match_id uuid, p_winning_number integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_total  integer := 0;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Admin only';
  end if;
  if p_winning_number is null or p_winning_number < 0 or p_winning_number > 9 then
    raise exception 'Winning number must be 0 to 9';
  end if;

  select status into v_status from lottery_matches
    where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;
  if v_status = 'settled' then
    raise exception 'Match already settled';
  end if;

  update lottery_bets
     set status = case when number = p_winning_number then 'won' else 'lost' end,
         payout = case when number = p_winning_number then stake * 9 else 0 end
   where match_id = p_match_id and status = 'pending';

  select coalesce(sum(payout), 0) into v_total
    from lottery_bets where match_id = p_match_id and status = 'won';

  update lottery_players pl
     set credits = pl.credits + w.total
    from (select username, sum(payout) as total
            from lottery_bets
           where match_id = p_match_id and status = 'won'
           group by username) w
   where pl.username = w.username;

  update lottery_matches
     set status = 'settled', winning_number = p_winning_number,
         total_paid = v_total, settled_at = now()
   where id = p_match_id;

  return v_total;
end $$;

-- Admin adds credits (server-side so the anon key can't do it).
create or replace function lottery_add_credits(
  p_username text, p_amount integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_new integer;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Admin only';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'Amount must be at least 1';
  end if;
  update lottery_players set credits = credits + p_amount
    where username = p_username
    returning credits into v_new;
  if not found then
    raise exception 'Player not found';
  end if;
  return v_new;
end $$;

-- Admin removes credits (fails rather than going below zero).
create or replace function lottery_remove_credits(
  p_username text, p_amount integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_new integer;
  v_current integer;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Admin only';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'Amount must be at least 1';
  end if;
  select credits into v_current from lottery_players
    where username = p_username for update;
  if not found then
    raise exception 'Player not found';
  end if;
  if v_current < p_amount then
    raise exception 'Player only has % credits', v_current;
  end if;
  update lottery_players set credits = credits - p_amount
    where username = p_username
    returning credits into v_new;
  return v_new;
end $$;

-- 4. FUNCTION PERMISSIONS ----------------------------------------
-- (admin-only checks are enforced inside the functions too)

revoke execute on function lottery_create_player(text, text, integer) from anon;
revoke execute on function lottery_settle_match(uuid, integer) from anon;
revoke execute on function lottery_add_credits(text, integer) from anon;
revoke execute on function lottery_remove_credits(text, integer) from anon;

grant execute on function lottery_login(text, text) to anon, authenticated;
grant execute on function lottery_place_bet(text, text, uuid, integer, integer) to anon, authenticated;

-- 5. REFRESH API SCHEMA CACHE ------------------------------------
-- makes new tables/functions visible to the REST API immediately

notify pgrst, 'reload schema';
