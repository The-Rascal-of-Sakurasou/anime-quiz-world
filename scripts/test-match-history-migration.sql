-- Disposable PostgreSQL regression test for the production match-history migration.
-- This script creates only local test schemas and records. It does not connect to Supabase.

\set ON_ERROR_STOP on

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'CREATE ROLE anon'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'CREATE ROLE authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE 'CREATE ROLE service_role'; END IF;
END
$roles$;

CREATE SCHEMA auth;
CREATE SCHEMA private;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  username text
);

CREATE TABLE public.aqw_match_rooms (
  id uuid PRIMARY KEY,
  finished_at timestamptz,
  question_count integer NOT NULL,
  end_reason text,
  winner_id uuid,
  status text NOT NULL,
  max_players integer NOT NULL
);

CREATE TABLE public.aqw_match_players (
  room_id uuid NOT NULL REFERENCES public.aqw_match_rooms(id),
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  left_at timestamptz,
  PRIMARY KEY (room_id, user_id)
);

INSERT INTO public.profiles (id,display_name,username) VALUES
 ('10000000-0000-4000-8000-000000000001','Player A','player-a'),
 ('10000000-0000-4000-8000-000000000002','Player B','player-b'),
 ('10000000-0000-4000-8000-000000000003','Player C','player-c');

INSERT INTO public.aqw_match_rooms (id,finished_at,question_count,end_reason,winner_id,status,max_players) VALUES
 ('20000000-0000-4000-8000-000000000001',now()-interval '3 hours',5,'completed','10000000-0000-4000-8000-000000000001','completed',2),
 ('20000000-0000-4000-8000-000000000002',now()-interval '2 hours',5,'completed',NULL,'completed',2),
 ('20000000-0000-4000-8000-000000000003',now()-interval '1 hour',5,'completed',NULL,'completed',2),
 ('20000000-0000-4000-8000-000000000004',now()-interval '30 minutes',5,'cancelled',NULL,'cancelled',2),
 ('20000000-0000-4000-8000-000000000005',now()-interval '20 minutes',5,'completed',NULL,'completed',3),
 ('20000000-0000-4000-8000-000000000006',now()-interval '10 minutes',5,'playing',NULL,'playing',2),
 ('20000000-0000-4000-8000-000000000007',now()-interval '5 minutes',5,'completed',NULL,'completed',2);

INSERT INTO public.aqw_match_players (room_id,user_id,score,left_at) VALUES
 -- Completed 1v1 matches: both players have already left their rooms.
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',5,now()),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',3,now()),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1,now()),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',4,now()),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',2,now()),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002',2,now()),
 -- These must not be counted.
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001',1,now()),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002',0,now()),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001',3,now()),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002',2,now()),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003',1,now()),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001',1,NULL),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002',1,NULL),
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001',1,now());

\ir ../supabase/migrations/20261112160000_retain_completed_aqw_match_history_after_exit.sql

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  v_result := private.aqw_match_history_impl(20);

  IF (v_result #>> '{stats,matches}')::integer <> 3
     OR (v_result #>> '{stats,wins}')::integer <> 1
     OR (v_result #>> '{stats,losses}')::integer <> 1
     OR (v_result #>> '{stats,draws}')::integer <> 1 THEN
    RAISE EXCEPTION 'Player A stats incorrect: %',v_result->'stats';
  END IF;
  IF jsonb_array_length(v_result->'matches') <> 3 THEN
    RAISE EXCEPTION 'Player A should retain all three completed 1v1 matches: %',v_result->'matches';
  END IF;
  IF v_result #>> '{matches,0,result}' <> 'draw'
     OR v_result #>> '{matches,1,result}' <> 'loss'
     OR v_result #>> '{matches,2,result}' <> 'win' THEN
    RAISE EXCEPTION 'Player A outcomes or ordering incorrect: %',v_result->'matches';
  END IF;
  IF v_result #>> '{matches,2,opponent_name}' <> 'Player B' THEN
    RAISE EXCEPTION 'Opponent profile data missing: %',v_result->'matches';
  END IF;

  v_result := private.aqw_match_history_impl(1);
  IF (v_result #>> '{stats,matches}')::integer <> 3
     OR jsonb_array_length(v_result->'matches') <> 1 THEN
    RAISE EXCEPTION 'History limit must not change aggregate stats: %',v_result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  v_result := private.aqw_match_history_impl(20);
  IF (v_result #>> '{stats,wins}')::integer <> 1
     OR (v_result #>> '{stats,losses}')::integer <> 1
     OR (v_result #>> '{stats,draws}')::integer <> 1 THEN
    RAISE EXCEPTION 'Player B stats incorrect: %',v_result->'stats';
  END IF;

  PERFORM set_config('request.jwt.claim.sub','',true);
  BEGIN
    PERFORM private.aqw_match_history_impl(20);
    RAISE EXCEPTION 'Unauthenticated history request unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '28000' THEN NULL;
  END;

  IF has_function_privilege('anon','private.aqw_match_history_impl(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute the private history function';
  END IF;
  IF NOT has_function_privilege('authenticated','private.aqw_match_history_impl(integer)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must retain execute permission on the private wrapper target';
  END IF;
  IF has_schema_privilege('anon','private','USAGE')
     OR has_schema_privilege('authenticated','private','USAGE') THEN
    RAISE EXCEPTION 'The private schema must remain unexposed to API roles';
  END IF;
END
$test$;

\echo 'PASS: completed match history persists after room exit; 1v1 filters, stats, limit, auth and grants verified.'
