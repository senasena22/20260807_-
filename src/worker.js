const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4MB, generous for a JSON backup of flashcard data

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/sync/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const code = url.pathname.slice("/api/sync/".length);
      if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
        return jsonResponse({ error: "invalid code" }, 400);
      }
      const key = `sync:${code.toUpperCase()}`;

      if (request.method === "PUT") {
        const body = await request.text();
        if (body.length > MAX_PAYLOAD_BYTES) {
          return jsonResponse({ error: "payload too large" }, 413);
        }
        await env.SYNC_KV.put(key, body, { expirationTtl: 60 * 60 * 24 * 90 }); // 90 days
        return jsonResponse({ ok: true });
      }

      if (request.method === "GET") {
        const value = await env.SYNC_KV.get(key);
        if (value === null) {
          return jsonResponse({ error: "not found" }, 404);
        }
        return new Response(value, { headers: { "content-type": "application/json", ...CORS_HEADERS } });
      }

      return jsonResponse({ error: "method not allowed" }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};
