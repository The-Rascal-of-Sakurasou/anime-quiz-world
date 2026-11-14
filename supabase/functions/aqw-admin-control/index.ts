import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_TABLES = new Set(["aqw_player_stats", "aqw_speed_rush_scores", "follows", "post_likes", "notifications", "friend_messages"]);
const REPORT_STATUSES = new Set(["pending", "reviewing", "resolved", "dismissed"]);
const QA_STATUSES = new Set(["new", "reviewing", "answered", "closed"]);
const requireUuid = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new ApiError(label + "が正しくありません。");
  return value;
};
const requireText = (value: unknown, label: string, max: number): string => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ApiError(label + "は1〜" + max + "文字で入力してください。");
  return value.trim();
};
const getStoragePath = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    let path = value.trim();
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      const marker = "/storage/v1/object/public/aqw-social/";
      const index = url.pathname.indexOf(marker);
      if (index < 0 || url.origin !== Deno.env.get("SUPABASE_URL")) return null;
      path = decodeURIComponent(url.pathname.slice(index + marker.length));
    } else path = decodeURIComponent(path.replace(/^\/+/, ""));
    const parts = path.split("/");
    if (!path || path.length > 1024 || parts.some((part) => !part || part === "." || part === "..")) return null;
    return path;
  } catch { return null; }
};

Deno.serve(async (req: Request) => {
  if (req.headers.get("Origin") !== ALLOWED_ORIGIN) return json({ error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const requestId = crypto.randomUUID();
  let action = "unknown";
  try {
    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) throw new ApiError("JSON形式のリクエストが必要です。", 415);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new ApiError("ログインが必要です。", 401);
    const token = authHeader.slice(7);
    if (!token || token.length > 8192) throw new ApiError("認証情報が正しくありません。", 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !anonKey || !serviceKey) throw new ApiError("管理機能の設定を確認できません。", 503);
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) throw new ApiError("ログイン状態を確認できません。", 401);
    const { data: owner, error: ownerError } = await userClient.rpc("is_site_owner");
    if (ownerError || owner !== true) throw new ApiError("管理者権限がありません。", 403);
    let body: Record<string, unknown>;
    try {
      const rawBody = await req.text();
      if (new TextEncoder().encode(rawBody).byteLength > 16384) throw new ApiError("リクエストが大きすぎます。", 413);
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
      body = parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("リクエスト形式が正しくありません。");
    }
    if (typeof body.action !== "string") throw new ApiError("操作が指定されていません。");
    action = body.action;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const actorId = userData.user.id;

    if (action === "get_dashboard") {
      const tables = ["profiles", "posts", "notifications", "friend_messages"] as const;
      const counts = await Promise.all(tables.map(async (table) => {
        const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }));
      const { count: pendingReports, error } = await admin.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (error) throw error;
      const { count: pendingQuestions, error: qaError } = await admin.from("qa_questions").select("id", { count: "exact", head: true }).eq("status", "new");
      if (qaError) throw qaError;
      return json({ counts: { profiles: counts[0], posts: counts[1], notifications: counts[2], friend_messages: counts[3], pending_reports: pendingReports ?? 0, pending_questions: pendingQuestions ?? 0 } });
    }

    if (action === "list_reports") {
      const { data, error } = await admin.from("user_reports")
        .select("id,reporter_id,reported_user_id,message_id,post_id,reason,details,status,created_at,reviewed_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const ids = [...new Set((data || []).flatMap((row) => [row.reporter_id, row.reported_user_id]))];
      let profiles: Array<{ id: string; username: string; display_name: string }> = [];
      if (ids.length) {
        const result = await admin.from("profiles").select("id,username,display_name").in("id", ids);
        if (result.error) throw result.error;
        profiles = result.data || [];
      }
      const byId = new Map(profiles.map((profile) => [profile.id, profile]));
      return json({ reports: (data || []).map((report) => ({ ...report, reporter: byId.get(report.reporter_id) || null, target: byId.get(report.reported_user_id) || null })) });
    }

    if (action === "get_report_context") {
      const reportId = requireUuid(body.report_id, "通報ID");
      const { data: report, error } = await admin.from("user_reports").select("id,message_id,post_id").eq("id", reportId).maybeSingle();
      if (error) throw error;
      if (!report) throw new ApiError("通報が見つかりません。", 404);
      if (report.message_id) {
        const result = await admin.from("friend_messages").select("body,created_at").eq("id", report.message_id).maybeSingle();
        if (result.error) throw result.error;
        return json({ content: result.data?.body || "対象の内容は削除済み、または取得できません。", created_at: result.data?.created_at ?? null });
      }
      if (report.post_id) {
        const result = await admin.from("posts").select("body,created_at").eq("id", report.post_id).maybeSingle();
        if (result.error) throw result.error;
        return json({ content: result.data?.body || "対象の内容は削除済み、または取得できません。", created_at: result.data?.created_at ?? null });
      }
      return json({ content: "この通報には投稿・メッセージが紐付いていません。", created_at: null });
    }

    if (action === "update_report") {
      const reportId = requireUuid(body.report_id, "通報ID");
      if (typeof body.status !== "string" || !REPORT_STATUSES.has(body.status)) throw new ApiError("通報状態が正しくありません。");
      const pending = body.status === "pending";
      const { data, error } = await admin.from("user_reports").update({
        status: body.status, reviewed_at: pending ? null : new Date().toISOString(), reviewed_by: pending ? null : actorId,
      }).eq("id", reportId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("通報が見つかりません。", 404);
      return json({ success: true });
    }

    if (action === "list_posts") {
      const { data, error } = await admin.from("posts").select("id,user_id,body,image_path,parent_post_id,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const ids = [...new Set((data || []).map((row) => row.user_id))];
      let profiles: Array<{ id: string; username: string; display_name: string }> = [];
      if (ids.length) {
        const result = await admin.from("profiles").select("id,username,display_name").in("id", ids);
        if (result.error) throw result.error;
        profiles = result.data || [];
      }
      const byId = new Map(profiles.map((profile) => [profile.id, profile]));
      return json({ posts: (data || []).map((post) => ({ ...post, profile: byId.get(post.user_id) || null })) });
    }

    if (action === "update_post") {
      const postId = requireUuid(body.post_id, "投稿ID");
      const nextBody = requireText(body.body, "投稿本文", 2000);
      const { data, error } = await admin.from("posts").update({ body: nextBody, updated_at: new Date().toISOString() }).eq("id", postId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("投稿が見つかりません。", 404);
      return json({ success: true });
    }

    if (action === "delete_post") {
      const postId = requireUuid(body.post_id, "投稿ID");
      const { data: post, error: fetchError } = await admin.from("posts").select("id,image_path").eq("id", postId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!post) throw new ApiError("投稿が見つかりません。", 404);
      const { error: deleteError } = await admin.from("posts").delete().eq("id", postId);
      if (deleteError) throw deleteError;
      let imageCleanup = "none";
      const path = getStoragePath(post.image_path);
      if (path) {
        const { error: storageError } = await admin.storage.from("aqw-social").remove([path]);
        imageCleanup = storageError ? "failed" : "deleted";
        if (storageError) console.error("AQW admin storage cleanup failed", { requestId, code: storageError.name || "storage_error" });
      }
      return json({ success: true, image_cleanup: imageCleanup });
    }

    if (action === "list_profiles") {
      const { data, error } = await admin.from("profiles").select("id,username,display_name,bio,created_at,leaderboard_enabled").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json({ profiles: data || [] });
    }

    if (action === "update_profile") {
      const profileId = requireUuid(body.profile_id, "プロフィールID");
      const displayName = requireText(body.display_name, "表示名", 40);
      if (typeof body.bio !== "string" || body.bio.length > 160) throw new ApiError("自己紹介は160文字以内で入力してください。");
      if (typeof body.leaderboard_enabled !== "boolean") throw new ApiError("ランキング掲載状態が正しくありません。");
      const { data, error } = await admin.from("profiles").update({
        display_name: displayName, bio: body.bio.trim(), leaderboard_enabled: body.leaderboard_enabled,
      }).eq("id", profileId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("プロフィールが見つかりません。", 404);
      return json({ success: true });
    }

    if (action === "list_data_records") {
      if (typeof body.table !== "string" || !DATA_TABLES.has(body.table)) throw new ApiError("管理対象が正しくありません。");
      const table = body.table;
      const columns: Record<string, string> = {
        aqw_player_stats: "user_id,total_xp,total_runs,total_correct,total_questions,accuracy_rate,updated_at",
        aqw_speed_rush_scores: "user_id,correct_count,elapsed_ms,updated_at",
        follows: "follower_id,following_id,created_at",
        post_likes: "user_id,post_id,created_at",
        notifications: "id,recipient_id,actor_id,kind,post_id,created_at",
        friend_messages: "id,sender_id,recipient_id,created_at",
      };
      const orderColumn = table === "aqw_player_stats" || table === "aqw_speed_rush_scores" ? "updated_at" : "created_at";
      const { data, error } = await admin.from(table).select(columns[table]).order(orderColumn, { ascending: false }).limit(100);
      if (error) throw error;
      return json({ records: data || [] });
    }

    if (action === "delete_data_record") {
      if (typeof body.table !== "string" || !DATA_TABLES.has(body.table)) throw new ApiError("管理対象が正しくありません。");
      const table = body.table;
      const keys = body.keys && typeof body.keys === "object" && !Array.isArray(body.keys) ? body.keys as Record<string, unknown> : {};
      let query: any;
      if (table === "aqw_player_stats" || table === "aqw_speed_rush_scores") {
        query = admin.from(table).delete().eq("user_id", requireUuid(keys.user_id, "ユーザーID"));
      } else if (table === "follows") {
        query = admin.from(table).delete().eq("follower_id", requireUuid(keys.follower_id, "フォロー元ID")).eq("following_id", requireUuid(keys.following_id, "フォロー先ID"));
      } else if (table === "post_likes") {
        query = admin.from(table).delete().eq("user_id", requireUuid(keys.user_id, "ユーザーID")).eq("post_id", requireUuid(keys.post_id, "投稿ID"));
      } else query = admin.from(table).delete().eq("id", requireUuid(keys.id, "データID"));
      const { data, error } = await query.select("*");
      if (error) throw error;
      if (!data?.length) throw new ApiError("対象データが見つかりません。", 404);
      return json({ success: true });
    }

    if (action === "list_qa_questions") {
      const { data, error } = await admin.from("qa_questions")
        .select("id,display_name,title,body,status,admin_reply,created_at,updated_at,answered_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json({ questions: data || [] });
    }

    if (action === "update_qa_question") {
      const questionId = requireUuid(body.question_id, "質問ID");
      if (typeof body.status !== "string" || !QA_STATUSES.has(body.status)) throw new ApiError("質問の対応状況が正しくありません。");
      if (typeof body.admin_reply !== "string" || body.admin_reply.trim().length > 3000) throw new ApiError("運営メモは3000文字以内で入力してください。");
      const { data: existing, error: fetchError } = await admin.from("qa_questions")
        .select("id,answered_at").eq("id", questionId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!existing) throw new ApiError("質問が見つかりません。", 404);
      const answeredAt = body.status === "answered" ? (existing.answered_at || new Date().toISOString()) : null;
      const { data, error } = await admin.from("qa_questions").update({
        status: body.status,
        admin_reply: body.admin_reply.trim(),
        updated_at: new Date().toISOString(),
        answered_at: answeredAt,
      }).eq("id", questionId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("質問が見つかりません。", 404);
      return json({ success: true, answered_at: answeredAt });
    }

    if (action === "list_users") {
      const page = Number(body.page);
      if (!Number.isInteger(page) || page < 1 || page > 1000) throw new ApiError("ページ番号が正しくありません。");
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const users = await Promise.all(data.users.map(async (user) => {
        const { data: isOwner, error: checkError } = await admin.rpc("is_site_owner_for_user", { target_user_id: user.id });
        if (checkError) throw checkError;
        return { id: user.id, email: user.email ?? "", created_at: user.created_at, last_sign_in_at: user.last_sign_in_at ?? null, banned_until: user.banned_until ?? null, is_admin: isOwner === true };
      }));
      return json({ users });
    }

    if (action === "set_ban") {
      const targetId = requireUuid(body.user_id, "対象ユーザーID");
      if (typeof body.banned !== "boolean") throw new ApiError("停止状態の指定が正しくありません。");
      if (targetId === actorId) throw new ApiError("自分自身の管理者アカウントはこの操作の対象にできません。");
      const { data: isOwner, error: checkError } = await admin.rpc("is_site_owner_for_user", { target_user_id: targetId });
      if (checkError) throw checkError;
      if (isOwner === true) throw new ApiError("管理者アカウントは停止できません。");
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetId);
      if (targetError || !target.user) throw new ApiError("対象ユーザーが見つかりません。", 404);
      const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: body.banned ? "876000h" : "none" });
      if (error) throw error;
      return json({ success: true });
    }

    throw new ApiError("未対応の操作です。");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (!(error instanceof ApiError)) {
      console.error("AQW admin operation failed", {
        requestId, action,
        code: error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "internal_error",
      });
    }
    const message = error instanceof ApiError ? error.message : "処理に失敗しました。時間をおいて再度お試しください。";
    return json({ error: message, request_id: requestId }, status);
  }
});