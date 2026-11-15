begin;
revoke insert on table public.qa_questions from anon, authenticated;
grant insert on table public.qa_questions to service_role;
drop policy if exists "Anyone can submit a question" on public.qa_questions;

create table private.qa_submission_rate_limits (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  window_10m_started_at timestamptz not null,
  count_10m integer not null default 1 check (count_10m >= 1),
  window_24h_started_at timestamptz not null,
  count_24h integer not null default 1 check (count_24h >= 1),
  updated_at timestamptz not null default now()
);

comment on table private.qa_submission_rate_limits is
  'Stores keyed HMAC fingerprints for Q&A abuse prevention; raw IP addresses are not stored.';
create index qa_submission_rate_limits_updated_at_idx
  on private.qa_submission_rate_limits (updated_at);
alter table private.qa_submission_rate_limits enable row level security;
revoke all on table private.qa_submission_rate_limits from public, anon, authenticated;
grant all on table private.qa_submission_rate_limits to service_role;

create or replace function private.consume_qa_submission_rate_limit(p_fingerprint text)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_count_10m integer;
  v_count_24h integer;
begin
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into private.qa_submission_rate_limits as current_limit
    (fingerprint, window_10m_started_at, count_10m, window_24h_started_at, count_24h, updated_at)
  values (p_fingerprint, v_now, 1, v_now, 1, v_now)
  on conflict (fingerprint) do update set
    window_10m_started_at = case when current_limit.window_10m_started_at <= v_now - interval '10 minutes' then v_now else current_limit.window_10m_started_at end,
    count_10m = case when current_limit.window_10m_started_at <= v_now - interval '10 minutes' then 1 else current_limit.count_10m + 1 end,
    window_24h_started_at = case when current_limit.window_24h_started_at <= v_now - interval '24 hours' then v_now else current_limit.window_24h_started_at end,
    count_24h = case when current_limit.window_24h_started_at <= v_now - interval '24 hours' then 1 else current_limit.count_24h + 1 end,
    updated_at = v_now
  returning count_10m, count_24h into v_count_10m, v_count_24h;
  delete from private.qa_submission_rate_limits where updated_at < v_now - interval '30 days';
  return v_count_10m <= 5 and v_count_24h <= 15;
end;
$function$;

revoke all on function private.consume_qa_submission_rate_limit(text) from public, anon, authenticated;
grant execute on function private.consume_qa_submission_rate_limit(text) to service_role;

create or replace function public.consume_qa_submission_rate_limit(p_fingerprint text)
returns boolean language sql security invoker set search_path = ''
as $function$ select private.consume_qa_submission_rate_limit(p_fingerprint); $function$;
revoke all on function public.consume_qa_submission_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_qa_submission_rate_limit(text) to service_role;
commit;
