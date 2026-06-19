import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [{ path: "/api/cron/backlog-refill", schedule: "0 13 * * *" }],
};
