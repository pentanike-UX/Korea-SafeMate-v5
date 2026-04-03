import { NextRequest, NextResponse } from "next/server";
import { wikiArticleRelevantToSpot } from "@/lib/v5/wiki-spot-relevance";

/** Wikimedia 권장 User-Agent */
const WIKI_UA = "Korea-SafeMate/1.0 (travel-planning; +https://github.com/pentanike-UX/Korea-SafeMate-v5)";

export type SpotEnrichmentOk = {
  ok: true;
  title: string;
  displayTitle: string;
  extract: string;
  thumbnail: string | null;
  articleUrl: string;
};

export type SpotEnrichmentErr = { ok: false; error: string };

async function wikiSearchTitles(query: string): Promise<string[]> {
  const url = new URL("https://ko.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", "10");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": WIKI_UA },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  return (data.query?.search ?? []).map((s) => s.title);
}

async function wikiSummary(title: string): Promise<SpotEnrichmentOk | null> {
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://ko.wikipedia.org/api/rest_v1/page/summary/${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": WIKI_UA },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    type?: string;
    title?: string;
    displaytitle?: string;
    extract?: string;
    thumbnail?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  };
  if (j.type === "disambiguation" || !j.extract) return null;
  const articleUrl = j.content_urls?.desktop?.page ?? `https://ko.wikipedia.org/wiki/${path}`;
  return {
    ok: true,
    title: j.title ?? title,
    displayTitle: j.displaytitle ?? j.title ?? title,
    extract: j.extract,
    thumbnail: j.thumbnail?.source ?? null,
    articleUrl,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<SpotEnrichmentOk | SpotEnrichmentErr>> {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  const region = req.nextUrl.searchParams.get("region")?.trim() ?? "";
  if (!name || name.length > 160) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }

  try {
    const queries = region ? [`${name} ${region}`, name] : [name];
    for (const q of queries) {
      const titles = await wikiSearchTitles(q);
      for (const title of titles) {
        const summary = await wikiSummary(title);
        if (
          summary &&
          wikiArticleRelevantToSpot(name, region, summary.title, summary.extract)
        ) {
          return NextResponse.json(summary);
        }
      }
    }
    /** 위키 미검색은 흔함 — 404는 DevTools에서 오류처럼 보이므로 200 + ok:false */
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
