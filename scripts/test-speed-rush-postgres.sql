-- Integration test against a disposable real PostgreSQL instance.
-- Runs as authenticated, while auth.uid() is driven by the JWT claim fixture.
DO $test$
DECLARE
  v_run_id uuid;
  v_result jsonb;
  v_elapsed_ms integer;
  v_attempt_count integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  v_result := public.start_aqw_speed_rush();
  v_run_id := (v_result ->> 'run_id')::uuid;

  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'start RPC did not return a run ID';
  END IF;

  -- A different authenticated user must not be able to submit this run.
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  BEGIN
    PERFORM public.submit_aqw_speed_rush(10, 1, v_run_id);
    RAISE EXCEPTION 'foreign run ID was unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  -- The owner can submit. p_elapsed_ms=1 is deliberately false; the DB clock
  -- should produce a value >= 1000 after the wait.
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  PERFORM pg_sleep(1.1);
  v_result := public.submit_aqw_speed_rush(7, 1, v_run_id);
  v_elapsed_ms := (v_result ->> 'elapsed_ms')::integer;

  IF v_elapsed_ms < 1000 OR v_elapsed_ms > 120000 THEN
    RAISE EXCEPTION 'elapsed time was not computed from the server clock: %', v_elapsed_ms;
  END IF;
  IF v_result ->> 'duplicate' <> 'false' THEN
    RAISE EXCEPTION 'first valid submission was not recorded: %', v_result;
  END IF;

  -- The same run is single-use and cannot be replayed.
  BEGIN
    PERFORM public.submit_aqw_speed_rush(10, 1, v_run_id);
    RAISE EXCEPTION 'replayed run was unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  SELECT count(*) INTO v_attempt_count
    FROM private.aqw_speed_rush_attempts
   WHERE user_id = '11111111-1111-4111-8111-111111111111'
     AND run_id = v_run_id;
  IF v_attempt_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one attempt row, found %', v_attempt_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.aqw_speed_rush_scores
     WHERE user_id = '11111111-1111-4111-8111-111111111111'
       AND correct_count = 7
       AND elapsed_ms = v_elapsed_ms
  ) THEN
    RAISE EXCEPTION 'leaderboard score did not store the server elapsed time';
  END IF;
END
$test$;

-- Verify that unauthenticated callers are rejected by the private start logic.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);
DO $unauth$
BEGIN
  BEGIN
    PERFORM private.start_aqw_speed_rush();
    RAISE EXCEPTION 'unauthenticated start was unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '28000' THEN
    NULL;
  END;
END
$unauth$;
