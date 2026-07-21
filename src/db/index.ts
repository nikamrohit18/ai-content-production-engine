import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Agent, fetch as undiciFetch } from "undici";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

const dispatcher = new Agent({ connectTimeout: 30_000 });

// This dev machine's connection to Neon's HTTP endpoint fails intermittently at the transport
// level (TypeError: fetch failed / ConnectTimeoutError) on a meaningful fraction of attempts —
// confirmed by running the same query dozens of times back to back, isolated from any app code,
// and seeing roughly 1-in-4 to 1-in-6 attempts fail outright while the rest succeed in well
// under a second. A single query has decent odds of getting lucky; a page making several DB
// round trips (like /backlog's topics + videos/scripts/nicheTemplates) compounds those odds
// against it. Retrying transient failures a few times brings the effective failure rate for
// any one logical query down to a fraction of a percent.
const MAX_ATTEMPTS = 4;

neonConfig.fetchFunction = async (input: string | URL | Request, init?: RequestInit) => {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await undiciFetch(input as string, { ...(init as object), dispatcher } as never);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
};

/**
 * Lazy singleton — avoids evaluating DATABASE_URL at module load time,
 * which would crash `next build` before env vars are provisioned.
 */
export function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

export * as schema from "./schema";
