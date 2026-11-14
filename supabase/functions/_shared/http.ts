export const AQW_ALLOWED_ORIGIN = "https://the-rascal-of-sakurasou.github.io";

export const AQW_CORS_HEADERS: Record<string, string> = Object.freeze({
  "Access-Control-Allow-Origin": AQW_ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
});

export function createJsonResponder(corsHeaders: Record<string, string>) {
  return (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
