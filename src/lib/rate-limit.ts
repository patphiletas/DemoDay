import { headers } from "next/headers";

type Entry = { count: number; resetAt: number };

// In-memory store — resets on server restart, single-instance only.
// For multi-instance production, replace with @upstash/ratelimit + Vercel KV.
const store = new Map<string, Entry>();

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/** 5 tentatives par fenêtre de 15 min — pour signin/signup */
export async function authRateLimit(label: string): Promise<boolean> {
  const ip = await getClientIp();
  return check(`${label}:${ip}`, 5, 15 * 60 * 1000);
}

/** 10 actions par minute — pour commentaires/soumissions (par userId) */
export function interactionRateLimit(label: string, userId: string): boolean {
  return check(`${label}:${userId}`, 10, 60 * 1000);
}
