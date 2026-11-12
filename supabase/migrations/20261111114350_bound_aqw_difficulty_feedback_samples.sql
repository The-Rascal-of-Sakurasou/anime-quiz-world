
CREATE POLICY aqw_player_stat_runs_deny_client_access
ON private.aqw_player_stat_runs
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE OR REPLACE FUNCTION private.get_aqw_question_difficulty_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH raw_attempts AS (
    SELECT
      run.user_id,
      run.created_at,
      (attempt.value->>'animeId')::bigint AS anime_id,
      attempt.value->>'questionMode' AS question_mode,
      (attempt.value->>'correct')::boolean AS correct
    FROM private.aqw_player_stat_runs AS run
    CROSS JOIN LATERAL jsonb_array_elements(run.question_results) AS attempt(value)
    WHERE run.created_at >= now() - interval '180 days'
  ),
  limited_attempts AS (
    SELECT
      user_id,
      anime_id,
      question_mode,
      correct,
      row_number() OVER (
        PARTITION BY user_id, anime_id, question_mode
        ORDER BY created_at DESC
      ) AS user_attempt_number
    FROM raw_attempts
  ),
  aggregated AS (
    SELECT
      anime_id,
      question_mode,
      count(*)::integer AS attempts,
      round(avg(CASE WHEN correct THEN 1.0 ELSE 0.0 END)::numeric, 4) AS correct_rate
    FROM limited_attempts
    WHERE user_attempt_number <= 5
    GROUP BY anime_id, question_mode
    HAVING count(*) >= 20 AND count(DISTINCT user_id) >= 5
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'animeId', aggregated.anime_id,
        'questionMode', aggregated.question_mode,
        'attempts', aggregated.attempts,
        'correctRate', aggregated.correct_rate
      )
      ORDER BY aggregated.anime_id, aggregated.question_mode
    ),
    '[]'::jsonb
  )
  FROM aggregated;
$function$;
