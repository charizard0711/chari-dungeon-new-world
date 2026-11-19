-- Apply from the Supabase SQL editor or CLI. Only the private API/worker uses
-- these tables and RPCs; browser roles have no direct read/write privileges.
create table public.ranking_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 12),
  name_key text not null unique,
  created_at timestamptz not null default now(),
  renamed_at timestamptz not null default now()
);
create table public.ranking_runs (
  id uuid primary key,
  user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
  request_id uuid not null,
  name text not null,
  seed text not null,
  ruleset text not null,
  difficulty text not null check (difficulty in ('normal','hard','master')),
  gender text not null check (gender in ('male','female')),
  status text not null default 'open' check (status in ('open','queued','verifying','verified','rejected','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  submitted_at timestamptz,
  locked_at timestamptz,
  attempts integer not null default 0,
  submission_hash text,
  commands jsonb,
  claimed jsonb,
  result jsonb,
  rejection text,
  unique(user_id, request_id),
  check (commands is null or jsonb_typeof(commands) = 'array' and jsonb_array_length(commands) <= 30000)
);
create index ranking_runs_queue on public.ranking_runs(status, submitted_at);
create index ranking_runs_user on public.ranking_runs(user_id, created_at desc);
create table public.ranking_entries (
  user_id uuid not null references public.ranking_profiles(user_id) on delete cascade,
  difficulty text not null check (difficulty in ('normal','hard','master')),
  ruleset text not null,
  run_id uuid not null references public.ranking_runs(id),
  cleared boolean not null,
  floor integer not null check (floor between 1 and 30),
  boss_room boolean not null,
  arrival_turns integer not null check (arrival_turns >= 0),
  turns integer not null check (turns >= arrival_turns and turns <= 1000000),
  rank_turns integer generated always as (case when cleared then turns else arrival_turns end) stored,
  finished_at timestamptz not null,
  primary key (user_id, difficulty, ruleset),
  check (not cleared or floor = 30 and boss_room)
);
create index ranking_entries_order on public.ranking_entries(ruleset,difficulty,cleared desc,floor desc,boss_room desc,rank_turns);
alter table public.ranking_profiles enable row level security;
alter table public.ranking_runs enable row level security;
alter table public.ranking_entries enable row level security;
revoke all on public.ranking_profiles,public.ranking_runs,public.ranking_entries from public,anon,authenticated;
grant all on public.ranking_profiles,public.ranking_runs,public.ranking_entries to service_role;

create function public.ranking_reserve_name(p_user uuid,p_name text,p_key text) returns text
language plpgsql security invoker set search_path = '' as $$
declare previous public.ranking_profiles;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select * into previous from public.ranking_profiles where user_id=p_user for update;
  if found and previous.name_key <> p_key and previous.renamed_at > now()-interval '1 day' then
    raise exception 'RENAME_LIMIT';
  end if;
  insert into public.ranking_profiles(user_id,name,name_key) values(p_user,p_name,p_key)
  on conflict(user_id) do update set name=excluded.name,name_key=excluded.name_key,
    renamed_at=case when ranking_profiles.name_key=excluded.name_key then ranking_profiles.renamed_at else now() end;
  return p_name;
end $$;

create function public.ranking_start_run(p_user uuid,p_id uuid,p_request uuid,p_seed text,p_ruleset text,p_difficulty text,p_gender text)
returns public.ranking_runs language plpgsql security invoker set search_path = '' as $$
declare item public.ranking_runs; player_name text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select * into item from public.ranking_runs where user_id=p_user and request_id=p_request;
  if found then return item; end if;
  select name into player_name from public.ranking_profiles where user_id=p_user;
  if not found then raise exception 'NAME_REQUIRED'; end if;
  if (select count(*) from public.ranking_runs where user_id=p_user and created_at > now()-interval '1 day') >= 100
    or (select count(*) from public.ranking_runs where user_id=p_user and created_at > now()-interval '1 minute') >= 5 then
    raise exception 'RUN_LIMIT';
  end if;
  if p_difficulty <> 'normal' and not exists (
    select 1 from public.ranking_entries where user_id=p_user and ruleset=p_ruleset and cleared
      and difficulty=case when p_difficulty='hard' then 'normal' else 'hard' end
  ) then raise exception 'DIFFICULTY_LOCKED'; end if;
  update public.ranking_runs set status='cancelled' where user_id=p_user and status='open';
  insert into public.ranking_runs(id,user_id,request_id,name,seed,ruleset,difficulty,gender)
    values(p_id,p_user,p_request,player_name,p_seed,p_ruleset,p_difficulty,p_gender) returning * into item;
  return item;
end $$;

create function public.ranking_submit(p_user uuid,p_id uuid,p_hash text,p_commands jsonb,p_claimed jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare item public.ranking_runs;
begin
  select * into item from public.ranking_runs where id=p_id and user_id=p_user for update;
  if not found then raise exception 'RUN_NOT_FOUND'; end if;
  if item.submission_hash is not null then
    if item.submission_hash<>p_hash then raise exception 'ALREADY_SUBMITTED'; end if;
    return item.status;
  end if;
  if item.status<>'open' or item.expires_at<now() then raise exception 'RUN_EXPIRED'; end if;
  perform pg_advisory_xact_lock(1492026011);
  if (select count(*) from public.ranking_runs where status in ('queued','verifying')) >= 256
    or (select count(*) from public.ranking_runs where user_id=p_user and status in ('queued','verifying')) >= 3 then
    raise exception 'QUEUE_BUSY';
  end if;
  update public.ranking_runs set commands=p_commands,claimed=p_claimed,submission_hash=p_hash,status='queued',submitted_at=now() where id=p_id;
  return 'queued';
end $$;

-- Leases survive API/worker restarts. A lost worker cannot publish after its lease
-- has been replaced: completion must supply the claim's attempt number.
create function public.ranking_claim() returns setof public.ranking_runs
language sql security invoker set search_path = '' as $$
  update public.ranking_runs set status='verifying',locked_at=now(),attempts=attempts+1
  where id=(select id from public.ranking_runs where attempts<3 and
    (status='queued' or status='verifying' and locked_at<now()-interval '15 minutes')
    order by submitted_at for update skip locked limit 1)
  returning *;
$$;
create function public.ranking_complete(p_id uuid,p_attempt integer,p_result jsonb,p_rejection text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare item public.ranking_runs;
begin
  select * into item from public.ranking_runs where id=p_id for update;
  if not found or item.status<>'verifying' or item.attempts<>p_attempt then raise exception 'STALE_LEASE'; end if;
  if p_rejection is not null then
    update public.ranking_runs set status='rejected',rejection=p_rejection,commands=null where id=p_id;
    return;
  end if;
  if p_result is null or p_result is distinct from item.claimed then raise exception 'RESULT_MISMATCH'; end if;
  insert into public.ranking_entries(user_id,difficulty,ruleset,run_id,cleared,floor,boss_room,arrival_turns,turns,finished_at)
    values(item.user_id,item.difficulty,item.ruleset,item.id,(p_result->>'cleared')::boolean,(p_result->>'floor')::integer,
      (p_result->>'bossRoom')::boolean,(p_result->>'arrivalTurns')::integer,(p_result->>'turns')::integer,item.submitted_at)
    on conflict(user_id,difficulty,ruleset) do update
      set run_id=excluded.run_id,cleared=excluded.cleared,floor=excluded.floor,boss_room=excluded.boss_room,
        arrival_turns=excluded.arrival_turns,turns=excluded.turns,finished_at=excluded.finished_at
      where (excluded.cleared,excluded.floor,excluded.boss_room,-excluded.rank_turns) >
        (ranking_entries.cleared,ranking_entries.floor,ranking_entries.boss_room,-ranking_entries.rank_turns);
  update public.ranking_runs set status='verified',result=p_result,commands=null where id=p_id;
end $$;

create function public.ranking_board(p_difficulty text,p_ruleset text,p_user uuid default null)
returns table(rank bigint,name text,mine boolean,cleared boolean,floor integer,boss_room boolean,arrival_turns integer,turns integer,finished_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with board as (
    select rank() over(order by e.cleared desc,e.floor desc,e.boss_room desc,e.rank_turns) as rank,
      row_number() over(order by e.cleared desc,e.floor desc,e.boss_room desc,e.rank_turns,e.finished_at,e.user_id) as position,
      e.*,p.name from public.ranking_entries e join public.ranking_profiles p using(user_id)
      where e.difficulty=p_difficulty and e.ruleset=p_ruleset
  ) select rank,name,coalesce(user_id=p_user,false),cleared,floor,boss_room,arrival_turns,turns,finished_at
    from board where position<=50 or user_id=p_user order by position;
$$;
revoke all on function public.ranking_reserve_name(uuid,text,text),public.ranking_start_run(uuid,uuid,uuid,text,text,text,text),
  public.ranking_submit(uuid,uuid,text,jsonb,jsonb),public.ranking_claim(),public.ranking_complete(uuid,integer,jsonb,text),
  public.ranking_board(text,text,uuid) from public,anon,authenticated;
grant execute on function public.ranking_reserve_name(uuid,text,text),public.ranking_start_run(uuid,uuid,uuid,text,text,text,text),
  public.ranking_submit(uuid,uuid,text,jsonb,jsonb),public.ranking_claim(),public.ranking_complete(uuid,integer,jsonb,text),
  public.ranking_board(text,text,uuid) to service_role;
