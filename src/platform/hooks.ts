import { useCallback, useEffect, useRef, useState } from "react";
import { command } from "../utils/commandApi";
import { useAuth } from "../context/AuthContext";
export function friendly(e: any) {
  if (e?.name === "AbortError" || e?.name === "TimeoutError")
    return "This is taking longer than expected. Please try again.";
  if (e instanceof TypeError)
    return "Could not connect. Check your internet connection and try again.";
  if (e?.status >= 500)
    return "The service is temporarily unavailable. Please try again.";
  const text = String(e?.message || "Something went wrong. Please try again.");
  return /Exception|INTERNAL ASSERTION|PERMISSION_DENIED|https?:|<html|stack trace|Bearer |PRIVATE KEY/i.test(
    text,
  )
    ? "Could not complete this request. Please try again."
    : text.slice(0, 300);
}
export function useRemote<T = any>(
  path: string | null,
  body?: unknown,
  poll = 0,
  authenticated = true,
) {
  const { user } = useAuth(),
    [data, setData] = useState<T | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(!!path),
    [version, setVersion] = useState(0);
  const fingerprint = JSON.stringify(body),
    seq = useRef(0),
    identity = useRef("");
  const reload = useCallback(() => setVersion((n) => n + 1), []);
  useEffect(() => {
    let alive = true,
      inFlight = false;
    const generation = ++seq.current;
    const next = [path, fingerprint, authenticated, user?.uid].join("|");
    if (identity.current !== next) {
      setData(null);
      setLoading(!!path);
      identity.current = next;
    }
    setError(null);
    const run = async () => {
      if (!path || (authenticated && !user)) {
        setLoading(false);
        return;
      }
      if (inFlight) return;
      inFlight = true;
      try {
        const r = await command<T>(path, body, undefined, authenticated);
        if (alive && seq.current === generation) {
          setData(r);
          setError(null);
        }
      } catch (e) {
        if (alive && seq.current === generation) setError(friendly(e));
      } finally {
        inFlight = false;
        if (alive) setLoading(false);
      }
    };
    void run();
    const timer = poll
      ? setInterval(() => {
          if (document.visibilityState === "visible") void run();
        }, poll)
      : undefined;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [path, fingerprint, poll, authenticated, user?.uid, version]);
  return { data, error, loading, reload, setData };
}
