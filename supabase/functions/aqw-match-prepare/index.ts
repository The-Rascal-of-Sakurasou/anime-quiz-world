import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const shuffle = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\s　:：・'’"「」『』（）()［］\[\]!,，.。!?！？-]/g, "");

Deno.serve(async (req: Request) => {
  if (req.headers.get("Origin") !== ALLOWED_ORIGIN) return json({ error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "ログインが必要です。" }, 401);
    const token = authHeader.slice(7);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "ログイン状態を確認できません。" }, 401);
    const body = await req.json();
    const roomCode = String(body?.room_code || "").trim().toUpperCase();
    if (!/^[0-9A-F]{10}$/.test(roomCode)) return json({ error: "ルームコードが正しくありません。" }, 400);

    const { data: room, error: roomError } = await userClient.rpc("aqw_match_get_room", { p_room_code: roomCode });
    if (roomError || !room || room.host_id !== userData.user.id) {
      return json({ error: "問題を準備できるのはルームのホストだけです。" }, 403);
    }
    if (room.status !== "waiting" || !Array.isArray(room.players) || room.players.length !== 2 || !room.players.every((p: any) => p.is_ready)) {
      return json({ error: "2人とも準備完了になってから開始してください。" }, 409);
    }
    const count = Number(room.question_count);
    if (![5, 10, 15, 20].includes(count)) return json({ error: "問題数が正しくありません。" }, 400);

    const query = `query {
      Page(page: 1, perPage: 50) {
        media(type: ANIME, countryOfOrigin: JP, isAdult: false, sort: POPULARITY_DESC) {
          id
          countryOfOrigin
          title { romaji english native }
          coverImage { extraLarge large medium }
          format
          isAdult
        }
      }
    }`;
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error("作品データサービスに接続できませんでした。");
    const payload = await response.json();
    if (payload?.errors?.length) throw new Error("作品データを取得できませんでした。");
    const records = (payload?.data?.Page?.media || []).filter((a: any) =>
      a && a.countryOfOrigin === "JP" && a.isAdult !== true &&
      ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"].includes(a.format)
    ).map((a: any) => {
      const title = String(a.title?.english || a.title?.romaji || a.title?.native || "").trim();
      const image = String(a.coverImage?.extraLarge || a.coverImage?.large || a.coverImage?.medium || "");
      return { title, image };
    }).filter((a: any) => a.title && /^https:\/\/s[0-9]+\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\//.test(a.image));

    const unique = new Map<string, { title: string; image: string }>();
    for (const a of records) {
      const key = normalize(a.title);
      if (key && !unique.has(key)) unique.set(key, a);
    }
    const pool = shuffle([...unique.values()]);
    if (pool.length < Math.max(count + 3, 8)) throw new Error("対戦用の作品データが不足しています。時間をおいて再試行してください。");
    const selected = pool.slice(0, count);
    const questions = selected.map((correct: any) => {
      const distractors = shuffle(pool.filter((a: any) => normalize(a.title) !== normalize(correct.title))).slice(0, 3);
      const options = shuffle([correct.title, ...distractors.map((a: any) => a.title)]);
      return {
        prompt: "この作品のタイトルは？",
        image_url: correct.image,
        options,
        correct_option_index: options.findIndex((option: string) => normalize(option) === normalize(correct.title))
      };
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await admin.rpc("aqw_match_prepare_questions", {
      p_room_code: roomCode,
      p_user_id: userData.user.id,
      p_questions: questions
    });
    if (error) throw new Error(error.message || "問題を準備できませんでした。");
    return json({ success: true, ...data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "対戦の準備に失敗しました。" }, 400);
  }
});