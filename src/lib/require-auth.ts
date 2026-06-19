import { auth } from "@clerk/nextjs/server";

/**
 * Defense-in-depth check for Server Actions and Route Handlers. The proxy
 * matcher in src/proxy.ts already gates these routes, but Server Actions
 * aren't separate routes Next.js can match independently — a matcher gap
 * or refactor could silently skip proxy coverage, so every mutating
 * action verifies the session itself too.
 */
export async function requireAuth(): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
}
