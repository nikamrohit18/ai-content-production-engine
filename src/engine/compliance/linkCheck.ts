const USER_AGENT = "ai-content-production-engine/1.0 (link check; https://ai-content-engine.rohitnikam.tech)";
const TIMEOUT_MS = 8_000;

export type LinkCheckStatus = "ok" | "broken" | "redirected" | "unreachable";

export type LinkCheckResult = {
  status: LinkCheckStatus;
  httpStatus?: number;
  finalUrl?: string;
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function fetchOnce(url: string, method: "HEAD" | "GET"): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * research.ts/factcheck.ts generate citations from the model's own training
 * knowledge, not a live search — see the "no grounding" gap flagged in
 * review. This is a post-hoc reachability check so a reviewer can see which
 * citations are dead, redirected somewhere unrelated, or fabricated before
 * approving, instead of discovering it after the video is published.
 */
export async function checkLink(url: string): Promise<LinkCheckResult> {
  const originalHost = hostOf(url);
  if (!originalHost) return { status: "broken" };

  try {
    // Some hosts 404/405 a HEAD request even though GET works fine — retry
    // with GET before concluding the link is actually dead.
    let res = await fetchOnce(url, "HEAD").catch(() => null);
    if (!res || !res.ok) res = await fetchOnce(url, "GET");

    const finalHost = hostOf(res.url);
    if (!res.ok) return { status: "broken", httpStatus: res.status, finalUrl: res.url };
    if (finalHost && finalHost !== originalHost) return { status: "redirected", httpStatus: res.status, finalUrl: res.url };
    return { status: "ok", httpStatus: res.status, finalUrl: res.url };
  } catch {
    return { status: "unreachable" };
  }
}
