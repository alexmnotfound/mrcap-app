import type { ApiError } from "@/types/api";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveDefaultApiBase() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) {
    if (typeof window !== "undefined") {
      try {
        const envUrl = new URL(envBase);
        const envIsLocal = isLocalHost(envUrl.hostname);
        const currentIsLocal = isLocalHost(window.location.hostname);
        if (!envIsLocal || currentIsLocal) {
          return envBase;
        }
      } catch {
        return envBase;
      }
    } else {
      return envBase;
    }
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    if (hostname.startsWith("app.")) {
      return `${protocol}//${hostname.replace(/^app\./, "api.")}`;
    }
    return `${protocol}//${hostname}`;
  }
  return "http://localhost:8000";
}

type FetchOptions = RequestInit & {
  token?: string | null;
  baseUrl?: string;
  rateLimitMessage?: string;
};

const RATE_LIMIT_ALERT_COOLDOWN_MS = 10000;
let lastRateLimitAlertAt = 0;

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, baseUrl, headers, rateLimitMessage, ...rest } = options;
  const url = `${baseUrl ?? resolveDefaultApiBase()}${path}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(`Failed to connect to API at ${url}. Is the server running?`);
    }
    throw err;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  // Clone response for error handling if needed
  let responseText: string | null = null;

  if (!response.ok) {
    if (response.status === 429 && typeof window !== "undefined") {
      const now = Date.now();
      if (now - lastRateLimitAlertAt > RATE_LIMIT_ALERT_COOLDOWN_MS) {
        lastRateLimitAlertAt = now;
        const retryAfter = response.headers.get("Retry-After");
        const retryMessage = retryAfter ? ` Intenta de nuevo en ${retryAfter}s.` : "";
        const message =
          rateLimitMessage ?? `Estás clickeando demasiado, te voy a pedir que te calmes un ratito..${retryMessage}`;
        window.alert(message);
      }
    }
    let message = `Request failed with status ${response.status}`;
    try {
      const text = await response.text();
      responseText = text;
      
      if (isJson) {
        try {
          const payload = JSON.parse(text) as ApiError;
          if (payload?.detail) {
            message = payload.detail;
          }
        } catch {
          // If JSON parse fails, use the text
          if (text.length < 200) {
            message = `${message}: ${text}`;
          }
        }
      } else {
        // Not JSON, include text if short
        if (text.length < 200) {
          message = `${message}: ${text}`;
        } else {
          message = `${message} (received ${contentType || "unknown content type"})`;
        }
      }
    } catch {
      // ignore errors reading response
    }
    throw new Error(message);
  }

  // Response is OK, handle based on status code
  // 204 No Content has no body, return null/undefined
  if (response.status === 204) {
    return undefined as T;
  }

  // For other successful responses, parse JSON
  try {
    if (!isJson) {
      const text = await response.text();
      throw new Error(
        `Expected JSON but got ${contentType || "unknown content type"}. ` +
        `Response: ${text.substring(0, 200)}`
      );
    }
    
    const text = await response.text();
    // Handle empty response body
    if (!text || text.trim() === "") {
      return undefined as T;
    }
    
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON response from ${path}. ` +
          `Response: ${text.substring(0, 200)}`
        );
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Expected JSON") || err.message.includes("Invalid JSON"))) {
      throw err;
    }
    throw new Error(`Failed to parse response from ${path}: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export function getDefaultApiBase() {
  return resolveDefaultApiBase();
}

