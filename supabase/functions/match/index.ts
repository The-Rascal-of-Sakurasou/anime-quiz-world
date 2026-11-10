// Anime Quiz World — authenticated multiplayer gateway.
// DRAFT ONLY: requires public.aqw_match_dispatch, which has not been created yet.
// Do not deploy until the matching SQL dispatcher and isolated-database tests exist.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://the-rascal-of-sakurasou.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);
const ACTIONS = new Set([
  "create_room", "join_room", "set_ready", "start_match",
  "submit_answer", "get_match_state", "reconnect", "leave_room",
]);

function headers(origin: string | null): Record<string, string> {
  const result: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function respond(origin: string | null, status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateRoomCode(): string {
  const range = 900_000;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const sample = new Uint32Array(1);
  do crypto.getRandomValues(sample); while (sample[0] >= limit);
  return String(100_000 + sample[0] % range);
}

async function hmacRoomCode(code: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

function validatePayload(action: string, input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  if (action === "create_room") {
    const maxPlayers = input.max_players ?? 4;
    const questionCount = input.question_count ?? 10;
    if (!Number.isInteger(maxPlayers) || Number(maxPlayers) < 2 || Number(maxPlayers) > 8) {
      throw new Error("max_players must be an integer from 2 to 8");
    }
    if (!Number.isInteger(questionCount) || Number(questionCount) < 5 || Number(questionCount) > 20) {
      throw new Error("question_count must be an integer from 5 to 20");
    }
    output.max_players = maxPlayers;
    output.question_count = questionCount;
  } else if (action === "join_room") {
    if (typeof input.room_code !== "string" || !/^\d{6}$/.test(input.room_code)) {
      throw new Error("room_code must contain exactly 6 digits");
    }
    output.room_code = input.room_code;
  } else if (action === "set_ready") {
    if (!validUuid(input.match_id) || typeof input.ready !== "boolean") {
      throw new Error("match_id and ready are required");
    }
    output.match_id = input.match_id;
    output.ready = input.ready;
  } else if (action === "submit_answer") {
    if (!validUuid(input.match_id) || !Number.isInteger(input.question_no) ||
        Number(input.question_no) < 1 || typeof input.selected_option_id !== "string" ||
        input.selected_option_id.length < 1 || input.selected_option_id.length > 100) {
      throw new Error("Invalid answer payload");
    }
    output.match_id = input.match_id;
    output.question_no = input.question_no;
    output.selected_option_id = input.selected_option_id;
  } else if (["start_match", "get_match_state", "reconnect", "leave_room"].includes(action)) {
    if (!validUuid(input.match_id)) throw new Error("A valid match_id is required");
    output.match_id = input.match_id;
  }
  return output;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response("Origin not allowed", { status: 403 });
    }
    return new Response("ok", { status: 204, headers: headers(origin) });
  }
  if (request.method !== "POST") return respond(origin, 405, { error: "Method not allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond(null, 403, { error: "Origin not allowed" });

  try {
    const raw = await request.text();
    if (raw.length > 16_384) return respond(origin, 413, { error: "Request too large" });
    const body: unknown = JSON.parse(raw);
    if (!isObject(body) || typeof body.action !== "string" || !ACTIONS.has(body.action) ||
        !isObject(body.payload ?? {})) {
      return respond(origin, 400, { error: "Invalid request" });
    }

    const match = (request.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!match) return respond(origin, 401, { error: "Sign in is required" });

    const url = Deno.env.get("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const codeSecret = Deno.env.get("AQW_ROOM_CODE_SECRET");
    if (!url || !publicKey || !serviceKey || !codeSecret) {
      console.error("Multiplayer function secrets are incomplete");
      return respond(origin, 503, { error: "Multiplayer service is not configured" });
    }

    const authClient = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await authClient.auth.getUser(match[1]);
    if (authError || !auth.user) return respond(origin, 401, { error: "Invalid or expired session" });

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (body.action === "join_room") {
      const { data: allowed, error: rateLimitError } = await admin.rpc("aqw_match_rate_limit", {
        p_action: "join_room",
        p_actor_id: auth.user.id,
      });
      if (rateLimitError) throw new Error("Could not verify room-join rate limit");
      if (allowed !== true) {
        return respond(origin, 429, { error: "Too many room-code attempts. Try again in 10 minutes." });
      }
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError) throw new Error("Could not load player profile");

    const action = body.action;
    const payload = validatePayload(action, body.payload as Record<string, unknown>);
    payload.display_name = String(profile?.display_name ?? "AQW User").trim().slice(0, 40) || "AQW User";

    let oneTimeRoomCode: string | undefined;
    if (action === "create_room") {
      oneTimeRoomCode = generateRoomCode();
      payload.room_code_hash = await hmacRoomCode(oneTimeRoomCode, codeSecret);
    } else if (action === "join_room") {
      const code = String(payload.room_code);
      delete payload.room_code;
      payload.room_code_hash = await hmacRoomCode(code, codeSecret);
    }

    // actor_id is always taken from the verified JWT, never from request JSON.
    // The SQL dispatcher must be service_role-only and enforce all state transitions.
    const { data, error } = await admin.rpc("aqw_match_dispatch", {
      p_action: action,
      p_actor_id: auth.user.id,
      p_payload: payload,
    });
    if (error) {
      console.error("Multiplayer dispatcher rejected request", { action, code: error.code });
      return respond(origin, 409, { error: "The multiplayer action could not be completed" });
    }
    return respond(origin, 200, {
      data,
      ...(oneTimeRoomCode ? { room_code: oneTimeRoomCode } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond(origin, 400, { error: message });
  }
});
