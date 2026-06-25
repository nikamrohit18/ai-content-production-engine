import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getDb } from "@/db";
import { requireAuth } from "@/lib/require-auth";

/**
 * Streams a private Blob asset (reference image, voiceover mp3) to the
 * authenticated dashboard — private blobs can't be fetched by their bare
 * URL, only via the SDK's get() with the right token, so the browser needs
 * a same-origin route to go through instead.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;
  const db = getDb();
  const asset = await db.query.assets.findFirst({ where: (a, { eq }) => eq(a.id, assetId) });
  if (!asset?.blobUrl) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const result = await get(asset.blobUrl, { access: asset.blobAccess === "public" ? "public" : "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Blob not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Length": String(result.blob.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
