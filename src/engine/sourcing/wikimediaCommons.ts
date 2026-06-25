const COMMONS_API_BASE = "https://commons.wikimedia.org/w/api.php";
const MIN_USABLE_WIDTH = 800;

// Commons indexes scanned-book/document formats (e.g. image/vnd.djvu) under
// the "image/" mime prefix too, even though they're not usable as a single
// B-roll photo — an allowlist of actual raster photo formats is safer here
// than blocking known-bad ones individually. TIFF is deliberately excluded
// despite being a real raster format: no browser renders it in <img>, and
// Commons' TIFF scans run 50-100+ MB, useless for a dashboard reference
// image or a quick recreate/enhance pass.
const USABLE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Wikimedia requires a descriptive User-Agent identifying the app and a
 * contact point (https://meta.wikimedia.org/wiki/User-Agent_policy) —
 * generic/anonymous requests get rate-limited much more aggressively.
 */
const USER_AGENT = "ai-content-production-engine/1.0 (https://ai-content-engine.rohitnikam.tech)";

export type CommonsImageCandidate = {
  title: string;
  fileUrl: string;
  pageUrl: string;
  license: string;
  width: number;
  height: number;
  mimeType: string;
};

type CommonsSearchResponse = { query?: { search?: Array<{ title: string }> } };

type CommonsImageInfoResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        imageinfo?: Array<{
          url: string;
          descriptionurl: string;
          width: number;
          height: number;
          mime: string;
          extmetadata?: { LicenseShortName?: { value: string } };
        }>;
      }
    >;
  };
};

export async function searchCommonsImages(query: string, limit = 5): Promise<CommonsImageCandidate[]> {
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srnamespace: "6",
    srlimit: String(limit),
    format: "json",
  });

  const searchRes = await fetch(`${COMMONS_API_BASE}?${searchParams}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!searchRes.ok) throw new Error(`Commons search failed (${searchRes.status})`);
  const searchData: CommonsSearchResponse = await searchRes.json();
  const titles = (searchData.query?.search ?? []).map((r) => r.title);
  if (titles.length === 0) return [];

  const infoParams = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    format: "json",
  });

  const infoRes = await fetch(`${COMMONS_API_BASE}?${infoParams}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!infoRes.ok) throw new Error(`Commons imageinfo failed (${infoRes.status})`);
  const infoData: CommonsImageInfoResponse = await infoRes.json();

  const pages = Object.values(infoData.query?.pages ?? {});

  return pages
    .filter((p) => {
      const info = p.imageinfo?.[0];
      return info && USABLE_MIME_TYPES.has(info.mime) && info.width >= MIN_USABLE_WIDTH;
    })
    .map((p) => {
      const info = p.imageinfo![0];
      return {
        title: p.title,
        fileUrl: info.url,
        pageUrl: info.descriptionurl,
        license: info.extmetadata?.LicenseShortName?.value ?? "unknown",
        width: info.width,
        height: info.height,
        mimeType: info.mime,
      };
    });
}
