import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  TRAVELER_SAVED_POSTS_COOKIE,
  parseSavedPostIds,
  serializeSavedPostIds,
} from "@/lib/traveler-saved-posts-cookie";
import { listApprovedPostsMerged } from "@/lib/posts-public-merged.server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
};

export async function GET() {
  const jar = await cookies();
  const ids = parseSavedPostIds(jar.get(TRAVELER_SAVED_POSTS_COOKIE)?.value);
  return NextResponse.json({ ids });
}

export async function POST(req: Request) {
  let body: { post_id?: string; action?: "add" | "remove" | "toggle" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.post_id === "string" ? body.post_id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const approved = await listApprovedPostsMerged();
  const validIds = new Set(approved.map((p) => p.id));
  if (!validIds.has(id)) {
    return NextResponse.json({ error: "Unknown post" }, { status: 404 });
  }

  const jar = await cookies();
  let ids = parseSavedPostIds(jar.get(TRAVELER_SAVED_POSTS_COOKIE)?.value);
  const action = body.action ?? "toggle";
  const had = ids.includes(id);

  if (action === "remove") {
    ids = ids.filter((x) => x !== id);
  } else if (action === "add") {
    if (!had) ids = [...ids, id];
  } else {
    ids = had ? ids.filter((x) => x !== id) : [...ids, id];
  }

  const saved = ids.includes(id);
  const res = NextResponse.json({ ids, saved });
  res.cookies.set(TRAVELER_SAVED_POSTS_COOKIE, serializeSavedPostIds(ids), COOKIE_OPTIONS);
  return res;
}
