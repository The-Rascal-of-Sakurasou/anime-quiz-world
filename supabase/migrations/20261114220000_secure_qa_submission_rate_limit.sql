-- Enforce Q&A submissions through the server-side Edge Function only.
drop policy if exists "Anyone can submit a question" on public.qa_questions;
revoke insert on table public.qa_questions from anon, authenticated;

create table if not exists private.qa_submission_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists qa_submission_rate_limits_updated_at_idx
  on private.qa_submission_rate_limits (updated_at);
alter table private.qa_submission_rate_limits enable row level security;
revoke all on table private.qa_submission_rate_limits from public, anon, authenticated;
grant all on table private.qa_submission_rate_limits to service_role;

create or replace function public.consume_qa_submission_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into private.qa_submission_rate_limits (ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when private.qa_submission_rate_limits.window_started_at <= now() - interval '10 minutes' then now()
      else private.qa_submission_rate_limits.window_started_at
    end,
    request_count = case
      when private.qa_submission_rate_limits.window_started_at <= now() - interval '10 minutes' then 1
      else private.qa_submission_rate_limits.request_count + 1
    end,
    updated_at = now()
  returning request_count into v_count;

  delete from private.qa_submission_rate_limits
  where updated_at < now() - interval '30 days';

  return v_count <= 5;
end;
$function$;

revoke all on function public.consume_qa_submission_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_qa_submission_rate_limit(text) to service_role;
