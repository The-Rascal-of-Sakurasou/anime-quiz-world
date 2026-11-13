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
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});

Deno.serve(async (req: Request) => {
  if (req.headers.get("Origin") !== ALLOWED_ORIGIN) return json({ error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("認証が必要です。");
    const token = authHeader.slice(7);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("ログイン状態を確認できません。");
    const { data: owner, error: ownerError } = await userClient.rpc("is_site_owner");
    if (ownerError || owner !== true) throw new Error("管理者権限がありません。");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();

    if (body.action === "list_users") {
      const page = Math.max(1, Math.min(1000, Number(body.page) || 1));
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const users = await Promise.all(data.users.map(async (u) => {
        const { data: isOwner, error: checkError } = await admin.rpc("is_site_owner_for_user", { target_user_id: u.id });
        if (checkError) throw checkError;
        return {
          id: u.id, email: u.email ?? "", created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null, banned_until: u.banned_until ?? null,
          email_confirmed_at: u.email_confirmed_at ?? null, is_admin: isOwner === true
        };
      }));
      return json({ users });
    }

    if (body.action === "set_ban") {
      if (typeof body.user_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.user_id)) {
        throw new Error("対象ユーザーIDが正しくありません。");
      }
      if (typeof body.banned !== "boolean") throw new Error("停止状態の指定が正しくありません。");
      const targetId = body.user_id;
      if (targetId === userData.user.id) throw new Error("自分自身の管理者アカウントはこの操作の対象にできません。");
      const { data: isOwner, error: checkError } = await admin.rpc("is_site_owner_for_user", { target_user_id: targetId });
      if (checkError) throw checkError;
      if (isOwner === true) throw new Error("管理者アカウントは停止できません。");
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetId);
      if (targetError || !target.user) throw new Error("対象ユーザーが見つかりません。");
      const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: body.banned ? "876000h" : "none" });
      if (error) throw error;
      return json({ success: true });
    }
    throw new Error("未対応の操作です。");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "処理に失敗しました。" }, 400);
  }
});