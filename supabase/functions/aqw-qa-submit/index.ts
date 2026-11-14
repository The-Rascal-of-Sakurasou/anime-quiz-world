import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Access-Control-Expose-Headers": "Retry-After",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function hashClientIp(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin !== ALLOWED_ORIGIN) return json({ error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const declaredLength = Number(req.headers.get("Content-Length") || 0);
  if (declaredLength > 8192) return json({ error: "送信内容が大きすぎます。" }, 413);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Server configuration unavailable");

    const ip = req.headers.get("cf-connecting-ip")?.trim();
    if (!ip || ip.length > 64) {
      return json({ error: "送信元を確認できません。時間をおいて再度お試しください。" }, 503);
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8192) {
      return json({ error: "送信内容が大きすぎます。" }, 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "送信内容を読み取れませんでした。" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "入力内容を確認してください。" }, 400);
    }
    if (typeof (body as Record<string, unknown>).website === "string" && String((body as Record<string, unknown>).website).trim()) {
      return json({ success: true }, 200);
    }

    const payload = body as Record<string, unknown>;
    const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const question = typeof payload.body === "string" ? payload.body.trim() : "";
    if (displayName.length > 40 || title.length < 1 || title.length > 100 || question.length < 5 || question.length > 3000) {
      return json({ error: "入力内容を確認してください。" }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const ipHash = await hashClientIp(ip, serviceKey);
    const { data: allowed, error: limitError } = await admin
      .rpc("consume_qa_submission_rate_limit", { p_ip_hash: ipHash });
    if (limitError) {
      console.error("AQW Q&A rate-limit check failed:", limitError.message);
      return json({ error: "送信を受け付けられませんでした。時間をおいて再度お試しください。" }, 503);
    }
    if (allowed !== true) {
      return json(
        { error: "送信回数の上限に達しました。10分ほど待ってから再度お試しください。" },
        429,
        { "Retry-After": "600" },
      );
    }

    const { error: insertError } = await admin.from("qa_questions").insert({
      display_name: displayName,
      title,
      body: question,
    });
    if (insertError) {
      console.error("AQW Q&A insert failed:", insertError.message);
      return json({ error: "質問を保存できませんでした。時間をおいて再度お試しください。" }, 503);
    }
    return json({ success: true }, 201);
  } catch (error) {
    console.error("AQW Q&A submission failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "送信できませんでした。通信状態を確認して、時間をおいて再度お試しください。" }, 400);
  }
});
