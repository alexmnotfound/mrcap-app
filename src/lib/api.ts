import type { ApiError } from "@/types/api";

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type FetchOptions = RequestInit & { token?: string | null; baseUrl?: string };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, baseUrl, headers, ...rest } = options;
  const url = `${baseUrl ?? DEFAULT_BASE}${path}`;
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as ApiError;
      if (payload?.detail) {
        message = payload.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getDefaultApiBase() {
  return DEFAULT_BASE;
}

