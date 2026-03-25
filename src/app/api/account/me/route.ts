import { NextResponse } from "next/server";
import type { AppAccountRole } from "@/lib/auth/app-role";
import { guardianStatusFromRow, type GuardianProfileStatus } from "@/lib/auth/guardian-profile-status";
import { buildMockAccountMePayload } from "@/lib/dev/mock-guardian-auth";
import { getMockGuardianIdFromCookies } from "@/lib/dev/mock-guardian-cookies.server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";

export async function GET() {
  const mockId = await getMockGuardianIdFromCookies();
  if (mockId) {
    const mock = buildMockAccountMePayload(mockId);
    if (mock) {
      return NextResponse.json(mock);
    }
  }

  const sb = await getServerSupabaseForUser();
  if (!sb) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: appUser, error: uErr } = await sb
    .from("users")
    .select("id, email, app_role, avatar_url, legal_name, last_login_at, created_at, auth_provider")
    .eq("id", user.id)
    .maybeSingle();

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  const { data: profile, error: pErr } = await sb.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const meta = user.user_metadata ?? {};
  const sessionAvatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url) || (typeof meta.picture === "string" && meta.picture) || null;
  const sessionName =
    (typeof meta.full_name === "string" && meta.full_name) || (typeof meta.name === "string" && meta.name) || "";

  const { data: gpRow } = await sb
    .from("guardian_profiles")
    .select("profile_status, approval_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const guardian_status: GuardianProfileStatus = guardianStatusFromRow(
    gpRow as { profile_status?: string | null; approval_status?: string | null } | null,
  );

  return NextResponse.json({
    auth: {
      id: user.id,
      email: user.email,
      sessionAvatar,
      sessionName,
    },
    user: appUser,
    app_role: (appUser?.app_role as AppAccountRole | undefined) ?? "traveler",
    profile: profile ?? null,
    guardian_status,
  });
}
