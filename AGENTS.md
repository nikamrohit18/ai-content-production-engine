<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# shadcn/ui in this repo uses Base UI, not Radix

`npx shadcn add` was initialized with style `base-nova` on **Base UI** primitives (`@base-ui/react`), not Radix — so most online examples and training data for shadcn component composition won't match. Composition uses a `render={<Button .../>}` prop instead of Radix's `asChild`/`<Slot>` pattern. Check `src/components/ui/alert-dialog.tsx` for a worked example before assuming Radix APIs apply.

# Server Actions need their own auth check, not just `proxy.ts`

Next.js's own docs warn that a Proxy (`src/proxy.ts`) matcher doesn't independently cover Server Actions — they're handled as POST requests to the page route they're defined on, not a separate matchable route. Every mutating Server Action in `src/app/(dashboard)/**/actions.ts` calls `requireAuth()` (`src/lib/require-auth.ts`) directly as its first line. Any new Server Action must do the same — don't rely on `proxy.ts` alone to gate it.
