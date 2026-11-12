
create table if not exists public.aqw_speed_rush_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  correct_count smallint not null check (correct_count between 0 and 10),
  elapsed_ms integer not null check (elapsed_ms between 1000 and 120000),
  updated_at timestamptz not null default now()
);

alter table public.aqw_speed_rush_scores enable row level security;

drop policy if exists "Speed rush scores are publicly readable" on public.aqw_speed_rush_scores;
create policy "Speed rush scores are publicly readable"
  on public.aqw_speed_rush_scores
  for select
  to anon, authenticated
  using (true);

revoke all on table public.aqw_speed_rush_scores from anon, authenticated;
grant select on table public.aqw_speed_rush_scores to anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.submit_aqw_speed_rush(
  p_correct_count integer,
  p_elapsed_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_score public.aqw_speed_rush_scores%rowtype;
  v_updated boolean := false;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です。' using errcode = '28000';
  end if;

  if p_correct_count is null or p_correct_count < 0 or p_correct_count > 10 then
    raise exception '正解数が不正です。' using errcode = '22023';
  end if;

  if p_elapsed_ms is null or p_elapsed_ms < 1000 or p_elapsed_ms > 120000 then
    raise exception 'プレイ時間が不正です。' using errcode = '22023';
  end if;

  insert into public.aqw_speed_rush_scores (user_id, correct_count, elapsed_ms)
  values (v_user_id, p_correct_count, p_elapsed_ms)
  on conflict (user_id) do update
    set correct_count = excluded.correct_count,
        elapsed_ms = excluded.elapsed_ms,
        updated_at = now()
    where excluded.correct_count > public.aqw_speed_rush_scores.correct_count
       or (
         excluded.correct_count = public.aqw_speed_rush_scores.correct_count
         and excluded.elapsed_ms < public.aqw_speed_rush_scores.elapsed_ms
       )
  returning * into v_score;

  if found then
    v_updated := true;
  else
    select * into v_score
    from public.aqw_speed_rush_scores
    where user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'updated', v_updated,
    'correct_count', v_score.correct_count,
    'elapsed_ms', v_score.elapsed_ms,
    'updated_at', v_score.updated_at
  );
end;
$$;

revoke all on function public.submit_aqw_speed_rush(integer, integer) from public, anon;
grant execute on function public.submit_aqw_speed_rush(integer, integer) to authenticated;

comment on table public.aqw_speed_rush_scores is
  'AQW Speed Rush personal bests. Scores are client-reported and should be treated as casual leaderboard records, not verified competition results.';
