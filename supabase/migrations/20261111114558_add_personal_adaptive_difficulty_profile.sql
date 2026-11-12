
CREATE OR REPLACE FUNCTION private.get_aqw_my_difficulty_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH recent_attempts AS (
    SELECT
      run.run_id,
      run.created_at,
      (attempt.value->>'correct')::boolean AS correct,
      row_number() OVER (ORDER BY run.created_at DESC, run.run_id DESC) AS attempt_order
    FROM private.aqw_player_stat_runs AS run
    CROSS JOIN LATERAL jsonb_array_elements(run.question_results) AS attempt(value)
    WHERE run.user_id = auth.uid()
      AND run.created_at >= now() - interval '180 days'
  ),
  recent AS (
    SELECT run_id, correct
    FROM recent_attempts
    WHERE attempt_order <= 50
  )
  SELECT jsonb_build_object(
    'attempts', count(*)::integer,
    'runs', count(DISTINCT run_id)::integer,
    'correctRate', CASE WHEN count(*) > 0
      THEN round(avg(CASE WHEN correct THEN 1.0 ELSE 0.0 END)::numeric, 4)
      ELSE null
    END
  )
  FROM recent;
$function$;

CREATE OR REPLACE FUNCTION public.get_aqw_my_difficulty_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT private.get_aqw_my_difficulty_profile();
$function$;

REVOKE ALL ON FUNCTION private.get_aqw_my_difficulty_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_aqw_my_difficulty_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.get_aqw_my_difficulty_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aqw_my_difficulty_profile() TO authenticated;
