import { schema } from "@/db";
import { trendSearchQueries as historyQueries } from "./history";

type Niche = (typeof schema.nicheEnum.enumValues)[number];

const queriesByNiche: Partial<Record<Niche, string[]>> = {
  history: historyQueries,
};

export function getTrendSearchQueries(niche: Niche): string[] {
  return queriesByNiche[niche] ?? [];
}
