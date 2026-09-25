import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// In-memory sliding window rate limiter for sensitive paths
type RateBucket = { count: number; expiresAt: number };
const rateLimitMap = new Map<string, RateBucket>();

function isRateLimited(ip: string, path: string): boolean {
  // Only rate-limit sensitive mutation paths
  const isSensitive =
    path.startsWith("/login") ||
    path.startsWith("/admin-login") ||
    path.startsWith("/api/webhooks") ||
    path.includes("login") ||
    path.includes("register");

  if (!isSensitive) return false;

  const now = Date.now();
  const key = `${ip}:${path.split("?")[0]}`;
  const bucket = rateLimitMap.get(key);

  // Clean stale keys periodically (every 100 requests)
  if (Math.random() < 0.01) {
    for (const [k, b] of rateLimitMap.entries()) {
      if (b.expiresAt < now) rateLimitMap.delete(k);
    }
  }

  if (!bucket || bucket.expiresAt < now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + 60_000 });
    return false;
  }

  bucket.count++;
  if (bucket.count > 30) {
    return true; // Limit exceeded: max 30 attempts per minute
  }

  return false;
}

function applySecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set("X-Frame-Options", "SAMEORIGIN");
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  newHeaders.set("X-XSS-Protection", "1; mode=block");
  newHeaders.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (request.method === "POST" && isRateLimited(clientIp, url.pathname)) {
      return new Response(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Rate limit reached. Please pause a moment before trying again.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      const errResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applySecurityHeaders(errResponse);
    }
  },
};

