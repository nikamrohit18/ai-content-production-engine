import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

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
