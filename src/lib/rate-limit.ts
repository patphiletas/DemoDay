import { headers } from "next/headers";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sur Vercel, chaque requête peut tomber sur une instance serverless différente :
// un compteur en mémoire y est donc inopérant. En production, on partage les
// compteurs via Upstash Redis. Sans variables Upstash (dev local, tests), on
// retombe sur un compteur en mémoire, suffisant pour un seul processus.

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (!redis && process.env.VERCEL) {
  console.warn("[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN absents : repli sur un compteur en mémoire, inefficace sur Vercel.");
}

type Rule = { limit: number; window: Duration; windowMs: number };

const RULES = {
  auth: { limit: 5, window: "15 m", windowMs: 15 * 60 * 1000 },
  interaction: { limit: 10, window: "60 s", windowMs: 60 * 1000 },
} satisfies Record<string, Rule>;

const limiters = new Map<string, Ratelimit>();

function upstashLimiter(name: keyof typeof RULES): Ratelimit | null {
  if (!redis) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const rule = RULES[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
      prefix: `alternative:ratelimit:${name}`,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

// ─── Repli en mémoire (dev local, tests) ────────────────────────────────────

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function checkMemory(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

async function check(name: keyof typeof RULES, key: string): Promise<boolean> {
  const limiter = upstashLimiter(name);
  if (limiter) {
    try {
      const { success } = await limiter.limit(key);
      return success;
    } catch (error) {
      // Redis indisponible : on laisse passer plutôt que de bloquer tout le monde.
      console.error("[rate-limit] Upstash indisponible, requête autorisée", error);
      return true;
    }
  }
  const rule = RULES[name];
  return checkMemory(`${name}:${key}`, rule.limit, rule.windowMs);
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/** 5 tentatives par fenêtre de 15 min — pour signin/signup (par IP) */
export async function authRateLimit(label: string): Promise<boolean> {
  const ip = await getClientIp();
  return check("auth", `${label}:${ip}`);
}

/** 10 actions par minute — pour commentaires/soumissions (par userId) */
export async function interactionRateLimit(label: string, userId: string): Promise<boolean> {
  return check("interaction", `${label}:${userId}`);
}
