CREATE OR REPLACE FUNCTION private.submit_aqw_player_run(
  p_run_id uuid,
  p_correct_count integer,
  p_question_count integer,
  p_xp_multiplier integer,
  p_question_results jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_xp integer;
  v_inserted integer;
  v_stats public.aqw_player_stats%rowtype;
  v_results jsonb := coalesce(p_question_results, '[]'::jsonb);
  v_attempt jsonb;
  v_attempt_count integer;
  v_correct_attempt_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です。' USING errcode = '28000';
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'プレイIDが不正です。' USING errcode = '22023';
  END IF;
  IF p_question_count IS NULL OR p_question_count < 1 OR p_question_count > 10000 THEN
    RAISE EXCEPTION '問題数が不正です。' USING errcode = '22023';
  END IF;
  IF p_correct_count IS NULL OR p_correct_count < 0 OR p_correct_count > p_question_count THEN
    RAISE EXCEPTION '正解数が不正です。' USING errcode = '22023';
  END IF;
  IF p_xp_multiplier IS NULL OR p_xp_multiplier NOT IN (10, 15) THEN
    RAISE EXCEPTION '経験値倍率が不正です。' USING errcode = '22023';
  END IF;
  IF jsonb_typeof(v_results) <> 'array' OR jsonb_array_length(v_results) > 10000 THEN
    RAISE EXCEPTION '問題別回答データが不正です。' USING errcode = '22023';
  END IF;

  FOR v_attempt IN SELECT value FROM jsonb_array_elements(v_results) AS item(value)
  LOOP
    IF jsonb_typeof(v_attempt) <> 'object'
      OR jsonb_typeof(v_attempt->'animeId') <> 'number'
      OR (v_attempt->>'animeId') !~ '^[1-9][0-9]{0,9}$'
      OR jsonb_typeof(v_attempt->'questionMode') <> 'string'
      OR v_attempt->>'questionMode' NOT IN (
        'titleStudio', 'synonym', 'titleYear', 'synopsis'
      )
      OR jsonb_typeof(v_attempt->'correct') <> 'boolean'
    THEN
      RAISE EXCEPTION '問題別回答データの形式が不正です。' USING errcode = '22023';
    END IF;
  END LOOP;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE (value->>'correct')::boolean)::integer
    INTO v_attempt_count, v_correct_attempt_count
    FROM jsonb_array_elements(v_results) AS item(value);

  IF v_attempt_count > p_question_count THEN
    RAISE EXCEPTION '回答データの件数が問題数を超えています。' USING errcode = '22023';
  END IF;
  IF v_attempt_count > 0 AND v_correct_attempt_count <> p_correct_count THEN
    RAISE EXCEPTION '問題別回答データと正解数が一致しません。' USING errcode = '22023';
  END IF;

  v_xp := p_correct_count * p_xp_multiplier;
  INSERT INTO private.aqw_player_stat_runs(
    user_id, run_id, correct_count, question_count, xp_earned, question_results
  )
  VALUES (v_user_id, p_run_id, p_correct_count, p_question_count, v_xp, v_results)
  ON CONFLICT (user_id, run_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT * INTO v_stats FROM public.aqw_player_stats WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'updated', false,
      'duplicate', true,
      'total_xp', coalesce(v_stats.total_xp, 0),
      'total_runs', coalesce(v_stats.total_runs, 0)
    );
  END IF;

  INSERT INTO public.aqw_player_stats(
    user_id, total_xp, total_runs, total_correct, total_questions, updated_at
  )
  VALUES (v_user_id, v_xp, 1, p_correct_count, p_question_count, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.aqw_player_stats.total_xp + excluded.total_xp,
        total_runs = public.aqw_player_stats.total_runs + 1,
        total_correct = public.aqw_player_stats.total_correct + excluded.total_correct,
        total_questions = public.aqw_player_stats.total_questions + excluded.total_questions,
        updated_at = now()
  RETURNING * INTO v_stats;

  RETURN jsonb_build_object(
    'updated', true,
    'total_xp', v_stats.total_xp,
    'total_runs', v_stats.total_runs
  );
END;
$function$;
