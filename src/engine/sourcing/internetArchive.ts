const IA_SEARCH_BASE = "https://archive.org/advancedsearch.php";
const IA_METADATA_BASE = "https://archive.org/metadata";

// IA derivative thumbnails (e.g. "_thumb.jpg", "__ia_thumb.jpg") sit in the
// same files array as the original scan/photo, with no dimension fields to
// filter on like Wikimedia's imageinfo — a byte-size floor plus excluding
// non-original sources is the reliable way to skip them.
const MIN_USABLE_BYTES = 50_000;

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tiff: "image/tiff",
  tif: "image/tiff",
};

const USER_AGENT = "ai-content-production-engine/1.0 (https://ai-content-engine.rohitnikam.tech)";
const DELAY_BETWEEN_METADATA_CALLS_MS = 300;

export type InternetArchiveImageCandidate = {
  title: string;
  fileUrl: string;
  pageUrl: string;
  license: string;
  width: number;
  height: number;
  mimeType: string;
};

type IASearchResponse = {
  response?: { docs?: Array<{ identifier: string; title?: string; licenseurl?: string }> };
};

type IAMetadataResponse = {
  files?: Array<{ name: string; source?: string; size?: string }>;
  metadata?: { licenseurl?: string };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Internet Archive's search API only returns identifiers/titles, not file
 * listings — unlike Wikimedia there's no batch endpoint for file info across
 * multiple items, so each candidate needs its own /metadata/{identifier}
 * round trip to find a usable image file.
 */
export async function searchInternetArchiveImages(query: string, limit = 5): Promise<InternetArchiveImageCandidate[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", `${query} AND mediatype:(image)`);
  searchParams.append("fl[]", "identifier");
  searchParams.append("fl[]", "title");
  searchParams.append("fl[]", "licenseurl");
  searchParams.set("rows", String(limit));
  searchParams.set("output", "json");

  const searchRes = await fetch(`${IA_SEARCH_BASE}?${searchParams}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!searchRes.ok) throw new Error(`Internet Archive search failed (${searchRes.status})`);
  const searchData: IASearchResponse = await searchRes.json();
  const docs = searchData.response?.docs ?? [];

  const candidates: InternetArchiveImageCandidate[] = [];

  for (const [index, doc] of docs.entries()) {
    if (candidates.length >= limit) break;
    if (index > 0) await sleep(DELAY_BETWEEN_METADATA_CALLS_MS);

    const metaRes = await fetch(`${IA_METADATA_BASE}/${doc.identifier}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!metaRes?.ok) continue;

    const metaData: IAMetadataResponse = await metaRes.json();
    const usableFile = (metaData.files ?? []).find((file) => {
      if (file.source !== "original") return false;
      if (/thumb/i.test(file.name)) return false;
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(extension in EXTENSION_MIME)) return false;
      return Number(file.size ?? 0) >= MIN_USABLE_BYTES;
    });
    if (!usableFile) continue;

    const extension = usableFile.name.split(".").pop()!.toLowerCase();

    candidates.push({
      title: doc.title ?? doc.identifier,
      fileUrl: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(usableFile.name)}`,
      pageUrl: `https://archive.org/details/${doc.identifier}`,
      license: doc.licenseurl ?? metaData.metadata?.licenseurl ?? "unknown",
      width: 0,
      height: 0,
      mimeType: EXTENSION_MIME[extension],
    });
  }

  return candidates;
}
