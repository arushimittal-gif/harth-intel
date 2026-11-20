import { createServerFn } from "@tanstack/react-start";

// Scrape Zillow listing page server-side and extract photo URLs from the
// embedded JSON. This bypasses Zillow's iframe-embedding block while
// surfacing the same images shown on the public listing page.

type PhotoResult = {
  photos: string[];
  source: string | null;
  error?: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function dedupe(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    // Normalize so different size variants of the same photo collapse
    const key = u.replace(/-cc_ft_\d+\./, "-cc_ft_.").replace(/_\d+x\d+\./, "_.");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function extractPhotos(html: string): string[] {
  // Zillow listing pages embed photo URLs in several forms. Grab them all,
  // then dedupe and prefer the highest-resolution variant.
  const urls: string[] = [];

  // 1. Direct jpeg URLs on the zillowstatic CDN.
  const re = /https?:\/\/photos\.zillowstatic\.com\/[A-Za-z0-9_\-./]+\.(?:jpg|jpeg|webp)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) urls.push(m[0]);

  // 2. Escaped variants (\u002F, \/ ) inside embedded JSON.
  const re2 = /https?:\\?\/\\?\/photos\.zillowstatic\.com\\?\/[^"\\]+\.(?:jpg|jpeg|webp)/gi;
  while ((m = re2.exec(html)) !== null) {
    urls.push(m[0].replace(/\\\//g, "/").replace(/\\u002[fF]/g, "/"));
  }

  // Prefer the largest "_<size>.jpg" variant per photo id.
  const bestById = new Map<string, { url: string; size: number }>();
  for (const u of urls) {
    const idMatch = u.match(/\/([A-Za-z0-9\-_]+)_\d+\.(jpg|jpeg|webp)/i);
    const sizeMatch = u.match(/_(\d+)\.(jpg|jpeg|webp)/i);
    const id = idMatch?.[1] ?? u;
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
    const existing = bestById.get(id);
    if (!existing || size > existing.size) bestById.set(id, { url: u, size });
  }
  return dedupe(Array.from(bestById.values()).map((v) => v.url));
}

export const fetchListingPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: { zillowUrl?: string; address?: string; zip?: string }) => d)
  .handler(async ({ data }): Promise<PhotoResult> => {
    if (!data.zillowUrl) return { photos: [], source: null, error: "No zillowUrl" };
    try {
      const res = await fetch(data.zillowUrl, {
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        return { photos: [], source: null, error: `Zillow ${res.status}` };
      }
      const html = await res.text();
      const photos = extractPhotos(html);
      if (!photos.length) {
        return { photos: [], source: "zillow", error: "No photos found in page" };
      }
      return { photos: photos.slice(0, 40), source: "zillow" };
    } catch (e: any) {
      return { photos: [], source: null, error: e?.message ?? "fetch failed" };
    }
  });
