import dns from "node:dns";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

// This machine's IPv6 route to Neon's endpoint appears to be broken/black-holed rather than
// cleanly refused, so Node's default dual-stack resolution wastes the full connect timeout
// racing a dead IPv6 address before falling back to IPv4 — causing intermittent
// "TypeError: fetch failed" / ConnectTimeoutError from @neondatabase/serverless. Forcing
// IPv4-first resolution skips the dead path entirely.
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withWorkflow(nextConfig);
