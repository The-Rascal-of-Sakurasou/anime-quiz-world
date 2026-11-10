create table private.aqw_matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  desired_players smallint not null check (desired_players between 2 and 4),
  question_count smallint not null check (question_count in (5,10,15,20)),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index aqw_matchmaking_queue_search_idx
  on private.aqw_matchmaking_queue (desired_players, question_count, joined_at);

create table private.aqw_matchmaking_pair_history (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  last_matched_at timestamptz not null default now(),
  match_count integer not null default 1 check (match_count > 0),
  primary key (user_low,user_high),
  check (user_low < user_high)
);

create index aqw_matchmaking_pair_history_recent_idx
  on private.aqw_matchmaking_pair_history (last_matched_at desc);

alter table private.aqw_matchmaking_queue enable row level security;
alter table private.aqw_matchmaking_pair_history enable row level security;
revoke all on private.aqw_matchmaking_queue from public,anon,authenticated;
revoke all on private.aqw_matchmaking_pair_history from public,anon,authenticated;

create or replace function private.aqw_matchmaking_join_impl(
  p_max_players smallint default 2,
  p_question_count smallint default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_joined_at timestamptz;
  v_pool uuid[] := array[]::uuid[];
  v_group uuid[];
  v_room_id uuid;
  v_room_code text;
  v_attempt integer := 0;
  v_waiting_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;
  if p_max_players not between 2 and 4 then
    raise exception '参加人数は2〜4人にしてください。';
  end if;
  if p_question_count not in (5,10,15,20) then
    raise exception '問題数の指定が正しくありません。';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('aqw_matchmaking_global_v1',0));

  select r.room_code into v_room_code
  from public.aqw_match_players p
  join public.aqw_match_rooms r on r.id=p.room_id
  where p.user_id=v_user_id and p.left_at is null
    and r.status in ('waiting','playing')
  order by p.joined_at desc
  limit 1;
  if v_room_code is not null then
    delete from private.aqw_matchmaking_queue where user_id=v_user_id;
    return jsonb_build_object(
      'status','in_room',
      'room',private.aqw_match_get_room_impl(v_room_code)
    );
  end if;

  delete from private.aqw_matchmaking_queue
  where last_seen_at < now() - interval '90 seconds';

  insert into private.aqw_matchmaking_queue(user_id,desired_players,question_count)
  values(v_user_id,p_max_players,p_question_count)
  on conflict(user_id) do update
  set desired_players=excluded.desired_players,
      question_count=excluded.question_count,
      last_seen_at=now();

  select joined_at into v_joined_at
  from private.aqw_matchmaking_queue where user_id=v_user_id;

  select coalesce(array_agg(q.user_id order by q.joined_at,q.user_id),array[]::uuid[])
  into v_pool
  from (
    select q.user_id,q.joined_at
    from private.aqw_matchmaking_queue q
    where q.user_id<>v_user_id
      and q.desired_players=p_max_players
      and q.question_count=p_question_count
      and q.last_seen_at >= now() - interval '90 seconds'
      and not exists (
        select 1 from public.aqw_match_players p
        join public.aqw_match_rooms r on r.id=p.room_id
        where p.user_id=q.user_id and p.left_at is null
          and r.status in ('waiting','playing')
      )
    order by q.joined_at,q.user_id
    limit 30
  ) q;

  with recursive groups(users,last_idx) as (
    select array[v_user_id]::uuid[],0
    union all
    select g.users || v_pool[s.i],s.i
    from groups g
    cross join lateral generate_subscripts(v_pool,1) s(i)
    where s.i>g.last_idx
      and cardinality(g.users)<p_max_players
  )
  select g.users into v_group
  from groups g
  cross join lateral (
    select
      count(h.user_low) filter(where h.last_matched_at >= now()-interval '1 hour') as recent_1h,
      count(h.user_low) filter(where h.last_matched_at >= now()-interval '24 hours') as recent_24h,
      count(h.user_low) filter(where h.last_matched_at >= now()-interval '7 days') as recent_7d,
      coalesce(max(h.last_matched_at),'-infinity'::timestamptz) as latest_pairing,
      coalesce(sum(h.match_count),0) as total_pairings
    from unnest(g.users) with ordinality a(user_id,ord)
    join unnest(g.users) with ordinality b(user_id,ord) on a.ord<b.ord
    left join private.aqw_matchmaking_pair_history h
      on h.user_low=least(a.user_id,b.user_id)
     and h.user_high=greatest(a.user_id,b.user_id)
  ) score
  where cardinality(g.users)=p_max_players
  order by score.recent_1h,score.recent_24h,score.recent_7d,
           score.latest_pairing,score.total_pairings,random()
  limit 1;

  if v_group is null then
    select count(*) into v_waiting_count
    from private.aqw_matchmaking_queue q
    where q.desired_players=p_max_players
      and q.question_count=p_question_count
      and q.last_seen_at >= now()-interval '90 seconds'
      and q.joined_at <= v_joined_at;
    return jsonb_build_object(
      'status','searching',
      'joined_at',v_joined_at,
      'players_waiting',v_waiting_count,
      'required_players',p_max_players
    );
  end if;

  loop
    v_room_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    begin
      insert into public.aqw_match_rooms(
        room_code,host_id,status,max_players,question_count,expires_at
      ) values(
        v_room_code,v_user_id,'waiting',p_max_players,p_question_count,now()+interval '10 minutes'
      ) returning id into v_room_id;
      exit;
    exception when unique_violation then
      v_attempt:=v_attempt+1;
      if v_attempt>=5 then raise; end if;
    end;
  end loop;

  insert into public.aqw_match_players(room_id,user_id,seat)
  select v_room_id,g.user_id,g.seat::smallint
  from unnest(v_group) with ordinality g(user_id,seat)
  order by g.seat;

  insert into private.aqw_matchmaking_pair_history(
    user_low,user_high,last_matched_at,match_count
  )
  select least(a.user_id,b.user_id),greatest(a.user_id,b.user_id),now(),1
  from unnest(v_group) with ordinality a(user_id,ord)
  join unnest(v_group) with ordinality b(user_id,ord) on a.ord<b.ord
  on conflict(user_low,user_high) do update
  set last_matched_at=excluded.last_matched_at,
      match_count=private.aqw_matchmaking_pair_history.match_count+1;

  delete from private.aqw_matchmaking_queue where user_id=any(v_group);

  return jsonb_build_object(
    'status','matched',
    'room',private.aqw_match_get_room_impl(v_room_code)
  );
end;
$$;

create or replace function private.aqw_matchmaking_cancel_impl()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode='28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('aqw_matchmaking_global_v1',0));
  delete from private.aqw_matchmaking_queue where user_id=v_user_id;
  return jsonb_build_object('success',true);
end;
$$;

revoke all on function private.aqw_matchmaking_join_impl(smallint,smallint) from public,anon;
revoke all on function private.aqw_matchmaking_cancel_impl() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.aqw_matchmaking_join_impl(smallint,smallint) to authenticated;
grant execute on function private.aqw_matchmaking_cancel_impl() to authenticated;

create or replace function public.aqw_matchmaking_join(
  p_max_players smallint default 2,
  p_question_count smallint default 10
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.aqw_matchmaking_join_impl(p_max_players,p_question_count); $$;

create or replace function public.aqw_matchmaking_cancel()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.aqw_matchmaking_cancel_impl(); $$;

revoke all on function public.aqw_matchmaking_join(smallint,smallint) from public,anon;
revoke all on function public.aqw_matchmaking_cancel() from public,anon;
grant execute on function public.aqw_matchmaking_join(smallint,smallint) to authenticated;
grant execute on function public.aqw_matchmaking_cancel() to authenticated;
