import { auth } from "../firebase/config";
export function apiBase() {
  const base = String(import.meta.env.VITE_COMMAND_API_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  if (!base)
    throw new Error("The shared service is not configured for this build.");
  const parsed = new URL(base, location.origin);
  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
  )
    throw new Error("The shared service requires HTTPS.");
  return base;
}
export async function authHeaders() {
  if (!auth.currentUser)
    throw Object.assign(new Error("Sign in to continue."), { status: 401 });
  return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
}
export async function command<T = any>(
  path: string,
  body?: unknown,
  key?: string,
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authenticated ? await authHeaders() : {}),
  };
  if (key) headers["Idempotency-Key"] = key;
  const response = await fetch(`${apiBase()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(
      new Error("The service is temporarily unavailable. Please try again."),
      { status: response.status || 503 },
    );
  }
  if (!response.ok) {
    const raw = String(data.message || ""),
      safe =
        raw.length <= 300 &&
        !/Exception|https?:|<html|stack trace|PERMISSION_DENIED/i.test(raw);
    throw Object.assign(
      new Error(
        response.status >= 500
          ? "The service is temporarily unavailable. Please try again."
          : safe
            ? raw
            : "Could not complete this request. Please try again.",
      ),
      { status: response.status, code: data.code },
    );
  }
  return data;
}
