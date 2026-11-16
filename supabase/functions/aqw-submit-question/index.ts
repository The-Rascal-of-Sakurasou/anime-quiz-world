import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });
}
function charLength(value: string): number { return Array.from(value).length; }

async function fingerprintIp(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getAllowedApiKeys(): string[] {
  const keys: string[] = [];
  const publishableJson = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableJson) {
    try {
      const parsed = JSON.parse(publishableJson) as Record<string, unknown>;
      for (const value of Object.values(parsed)) if (typeof value === "string" && value.length > 0) keys.push(value);
    } catch { /* Fail closed if no valid public key is available. */ }
  }
  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacyAnonKey) keys.push(legacyAnonKey);
  return [...new Set(keys)];
}


async function readJsonLimited(req: Request, maxBytes: number): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("Origin") !== ALLOWED_ORIGIN) return json({ error: "許可されていない接続元です。" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("apikey");
    const allowedApiKeys = getAllowedApiKeys();
    if (!apiKey || allowedApiKeys.length === 0 || !allowedApiKeys.includes(apiKey)) return json({ error: "認証情報を確認できません。" }, 401);

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 16384) return json({ error: "送信内容が大きすぎます。" }, 413);
    let body: unknown;
    try {
      body = await readJsonLimited(req, 16384);
    } catch (error) {
      if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
        return json({ error: "送信内容が大きすぎます。" }, 413);
      }
      return json({ error: "入力内容が正しくありません。" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "入力内容が正しくありません。" }, 400);

    const website = typeof body.website === "string" ? body.website.trim() : "";
    if (website) return json({ success: true });

    const displayName = body.displayName == null ? "" : typeof body.displayName === "string" ? body.displayName.trim() : null;
    const title = typeof body.title === "string" ? body.title.trim() : null;
    const questionBody = typeof body.body === "string" ? body.body.trim() : null;
    if (displayName === null || title === null || questionBody === null ||
        charLength(displayName) > 40 || charLength(title) < 1 || charLength(title) > 100 ||
        charLength(questionBody) < 5 || charLength(questionBody) > 3000) {
      return json({ error: "入力内容を確認してください。" }, 400);
    }

    // Trust only the platform-injected Cloudflare client IP. Do not fall back to client-controlled forwarding headers.
    const ip = (req.headers.get("cf-connecting-ip") || "").trim();
    if (!/^[0-9a-fA-F:.]{3,64}$/.test(ip)) return json({ error: "送信元を確認できません。時間をおいて再度お試しください。" }, 503);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const hmacSecret = Deno.env.get("AQW_QA_RATE_LIMIT_HMAC_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !hmacSecret || hmacSecret.length < 32) {
      return json({ error: "送信機能を利用できません。時間をおいて再度お試しください。" }, 503);
    }

    const fingerprint = await fingerprintIp(ip, hmacSecret);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: rateLimitError } = await admin.rpc("consume_qa_submission_rate_limit", { p_fingerprint: fingerprint });
    if (rateLimitError || typeof allowed !== "boolean") {
      console.error("AQW Q&A rate-limit check failed.");
      return json({ error: "送信処理に失敗しました。時間をおいて再度お試しください。" }, 503);
    }
    if (!allowed) return json({ error: "送信回数の上限に達しました。しばらくしてから再度お試しください。" }, 429, { "Retry-After": "600" });

    const { error: insertError } = await admin.from("qa_questions").insert({ display_name: displayName, title, body: questionBody });
    if (insertError) {
      console.error("AQW Q&A submission failed:", insertError.code || "unknown");
      return json({ error: "送信できませんでした。時間をおいて再度お試しください。" }, 503);
    }
    return json({ success: true });
  } catch {
    console.error("AQW Q&A request could not be processed.");
    return json({ error: "送信できませんでした。入力内容と通信状態を確認してください。" }, 400);
  }
});
