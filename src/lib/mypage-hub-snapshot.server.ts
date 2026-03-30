import { mockBookings } from "@/data/mock/bookings";
import { getGuardianSeedBundle } from "@/data/mock/guardian-seed-bundle";
import { mockTravelerSavedPostIds, mockTravelerTripRequests } from "@/data/mock/traveler-hub";
import type { AppAccountRole } from "@/lib/auth/app-role";
import type { GuardianProfileStatus } from "@/lib/auth/guardian-profile-status";
import { isMockGuardianId } from "@/lib/dev/mock-guardian-auth";
import { fetchLedgerForUser } from "@/lib/points/point-ledger-service";
import { getMatchRequestsForGuardian, getMatchRequestsForTraveler } from "@/lib/traveler-match-requests.server";
import { getTravelerSavedGuardianIds } from "@/lib/traveler-saved-guardians-cookie";
import { getTravelerSavedPostIds } from "@/lib/traveler-saved-posts-cookie";
import { getSubmittedTravelerReviewsFromCookie } from "@/lib/traveler-submitted-reviews.server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";
import type { ContentPostStatus } from "@/types/domain";
import type {
  GuardianWorkspaceBlockAttention,
  GuardianWorkspaceNavBadgeKey,
  MypageHubSnapshot,
  TravelerBlockAttention,
  TravelerNavBadgeKey,
} from "@/types/mypage-hub";
import { GUARDIAN_WORKSPACE_NAV_BADGE_KEYS, TRAVELER_NAV_BADGE_KEYS } from "@/types/mypage-hub";

const RECENT_LEDGER_DAYS = 7;

function emptyTravelerNav(): Record<TravelerNavBadgeKey, number> {
  return TRAVELER_NAV_BADGE_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<TravelerNavBadgeKey, number>,
  );
}

function emptyGuardianWorkspaceNav(): Record<GuardianWorkspaceNavBadgeKey, number> {
  return GUARDIAN_WORKSPACE_NAV_BADGE_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<GuardianWorkspaceNavBadgeKey, number>,
  );
}

function countLedgerSinceIso(rows: { occurred_at: string }[], sinceIso: string): number {
  const since = new Date(sinceIso).getTime();
  return rows.filter((r) => new Date(r.occurred_at).getTime() >= since).length;
}

function emptyTravelerNavSignatures(): Record<TravelerNavBadgeKey, string> {
  return TRAVELER_NAV_BADGE_KEYS.reduce(
    (acc, k) => {
      acc[k] = "0";
      return acc;
    },
    {} as Record<TravelerNavBadgeKey, string>,
  );
}

function emptyGuardianWorkspaceNavSignatures(): Record<GuardianWorkspaceNavBadgeKey, string> {
  return GUARDIAN_WORKSPACE_NAV_BADGE_KEYS.reduce(
    (acc, k) => {
      acc[k] = "0";
      return acc;
    },
    {} as Record<GuardianWorkspaceNavBadgeKey, string>,
  );
}

export async function getMypageHubSnapshot(
  userId: string | null,
  appRole: AppAccountRole,
  guardianStatus: GuardianProfileStatus,
): Promise<MypageHubSnapshot> {
  const sb = createServiceRoleSupabase();
  const useMockTrip = !userId || isMockGuardianId(userId);
  const openTrip = useMockTrip
    ? mockTravelerTripRequests.filter((r) => r.status === "requested" || r.status === "reviewing").length
    : 0;

  const savedGuardianIdsSorted = userId ? [...(await getTravelerSavedGuardianIds())].sort() : [];
  const savedPostIdsSorted = useMockTrip
    ? [...mockTravelerSavedPostIds].sort()
    : [...(await getTravelerSavedPostIds())].sort();

  let matchRows = userId ? await getMatchRequestsForTraveler(userId) : [];
  const matchPending = matchRows.filter((m) => m.status === "requested").length;
  const matchAccepted = matchRows.filter((m) => m.status === "accepted").length;

  const submittedReviews = userId ? await getSubmittedTravelerReviewsFromCookie() : [];
  const reviewedMatchIds = new Set<string>();
  for (const s of submittedReviews) {
    if (s.booking_id) reviewedMatchIds.add(s.booking_id);
    if (s.id) reviewedMatchIds.add(s.id);
  }
  const matchReviewDue = matchRows.filter(
    (m) => m.status === "completed" && !reviewedMatchIds.has(m.id),
  ).length;

  let pointsRecentLedgerCount = 0;
  if (userId && !isMockGuardianId(userId)) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - RECENT_LEDGER_DAYS);
    const ledger = await fetchLedgerForUser(userId, 80);
    pointsRecentLedgerCount = countLedgerSinceIso(ledger, since.toISOString());
  }

  const travelerNavBadges = emptyTravelerNav();
  const travelerNavSignatures = emptyTravelerNavSignatures();
  /** 여정(mock) 파이프라인 + 저장 목록 변화 — LNB 「내 여정」 */
  const journeySavedSignal =
    savedGuardianIdsSorted.length > 0 || savedPostIdsSorted.length > 0 ? 1 : 0;
  travelerNavBadges.navJourneys = openTrip + journeySavedSignal;
  /** 매칭 쿠키 — 응답 대기 + 리뷰 미작성 완료 */
  travelerNavBadges.navMatches = matchPending + matchReviewDue;
  /** 포인트 원장 최근 활동 */
  travelerNavBadges.navPoints = pointsRecentLedgerCount;
  travelerNavBadges.navProfile = 0;
  travelerNavSignatures.navProfile = "profile:none";
  travelerNavSignatures.navJourneys = `journeys:open=${openTrip}:savedG=${savedGuardianIdsSorted.join("|")}:savedP=${savedPostIdsSorted.join("|")}`;
  travelerNavSignatures.navMatches = `matches:pending=${matchPending}:reviewDue=${matchReviewDue}:ids=${matchRows
    .map((m) => `${m.id}:${m.status}:${m.updated_at}`)
    .join("|")}`;
  travelerNavSignatures.navPoints = `points:recent=${pointsRecentLedgerCount}`;

  const travelerBadgeCount = TRAVELER_NAV_BADGE_KEYS.reduce((s, k) => s + travelerNavBadges[k], 0);

  const travelerBlockAttention: TravelerBlockAttention = {
    openTripRequests: openTrip,
    matches: {
      pending: matchPending,
      reviewDue: matchReviewDue,
      accepted: matchAccepted,
    },
    pointsRecentLedgerCount,
    savedGuardianCount: savedGuardianIdsSorted.length,
    savedPostCount: savedPostIdsSorted.length,
  };

  const guardianSegmentUnlocked = appRole === "guardian" || guardianStatus !== "none";

  if (!guardianSegmentUnlocked) {
    return {
      travelerBadgeCount,
      guardianBadgeCount: 0,
      guardianSegmentUnlocked: false,
      guardianOps: null,
      globalAttentionDot: travelerBadgeCount > 0,
      travelerNavBadges,
      travelerNavSignatures,
      guardianWorkspaceNavBadges: emptyGuardianWorkspaceNav(),
      guardianWorkspaceNavSignatures: emptyGuardianWorkspaceNavSignatures(),
      travelerBlockAttention,
      guardianWorkspaceBlockAttention: null,
    };
  }

  let guardianBadgeCount = 0;
  let guardianOps: MypageHubSnapshot["guardianOps"] = null;
  const guardianWorkspaceNavBadges = emptyGuardianWorkspaceNav();
  const guardianWorkspaceNavSignatures = emptyGuardianWorkspaceNavSignatures();
  let guardianWorkspaceBlockAttention: GuardianWorkspaceBlockAttention | null = null;

  if (guardianStatus === "submitted" || guardianStatus === "rejected" || guardianStatus === "suspended") {
    guardianBadgeCount = 1;
    guardianWorkspaceNavBadges.guardianNavProfile = 1;
    guardianWorkspaceNavSignatures.guardianNavProfile = `guardianStatus:${guardianStatus}`;
  }
  if (guardianStatus === "draft") {
    guardianBadgeCount = 1;
    guardianWorkspaceNavBadges.guardianNavProfile = 1;
    guardianWorkspaceNavSignatures.guardianNavProfile = "guardianStatus:draft";
  }

  if (guardianStatus === "approved" && userId) {
    const bundle = getGuardianSeedBundle();
    let postRows: Array<{ id: string; title: string; status: ContentPostStatus; created_at: string }> = bundle.posts
      .filter((p) => p.author_user_id === userId)
      .map((p) => ({ id: p.id, title: p.title ?? "", status: p.status, created_at: p.created_at }));
    if (!isMockGuardianId(userId) && sb) {
      const { data: dbPosts } = await sb
        .from("content_posts")
        .select("id, title, status, created_at")
        .eq("author_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120);
      if (dbPosts && dbPosts.length > 0) {
        postRows = dbPosts.map((p) => ({
          id: p.id,
          title: p.title ?? "",
          status:
            p.status === "approved" || p.status === "pending" || p.status === "draft"
              ? p.status
              : "rejected",
          created_at: p.created_at ?? new Date().toISOString(),
        }));
      }
    }
    const pendingPosts = postRows.filter((p) => p.status === "pending").length;
    const draftPosts = postRows.filter((p) => p.status === "draft").length;
    let reviewingBookings = mockBookings.filter((b) => b.guardian_user_id === userId && b.status === "reviewing").length;
    let inProgressBookings = mockBookings.filter(
      (b) =>
        b.guardian_user_id === userId &&
        (b.status === "in_progress" || b.status === "matched" || b.status === "confirmed"),
    ).length;
    let completedBookings = mockBookings.filter((b) => b.guardian_user_id === userId && b.status === "completed").length;
    let openPoolCount = mockBookings.filter((b) => b.guardian_user_id == null && b.status === "reviewing").length;
    if (!isMockGuardianId(userId) && sb) {
      const [{ data: myBookings }, { data: poolBookings }] = await Promise.all([
        sb
          .from("bookings")
          .select("status")
          .eq("guardian_user_id", userId)
          .limit(200),
        sb
          .from("bookings")
          .select("id")
          .is("guardian_user_id", null)
          .eq("status", "reviewing")
          .limit(1),
      ]);
      if (myBookings) {
        reviewingBookings = myBookings.filter((b) => b.status === "reviewing").length;
        inProgressBookings = myBookings.filter((b) =>
          b.status === "in_progress" || b.status === "matched" || b.status === "confirmed",
        ).length;
        completedBookings = myBookings.filter((b) => b.status === "completed").length;
      }
      openPoolCount = poolBookings?.length ? 1 : 0;
    }
    const points = bundle.pointsByAuthorId[userId] ?? null;
    const recentPosts = [...postRows]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title?.trim() || "",
        status: p.status,
        updatedAt: p.created_at,
      }));

    guardianOps = {
      pendingPosts,
      draftPosts,
      reviewingBookings,
      inProgressBookings,
      completedBookings,
      openPoolCount,
      points,
      recentPosts,
    };

    const guardianMatchRows = await getMatchRequestsForGuardian(userId);
    const incomingMatchRequests = guardianMatchRows.filter((r) => r.status === "requested").length;
    const poolSignal = openPoolCount > 0 ? 1 : 0;

    guardianWorkspaceNavBadges.guardianNavHome = 0;
    guardianWorkspaceNavBadges.guardianNavPosts = pendingPosts + (draftPosts > 0 ? 1 : 0);
    guardianWorkspaceNavBadges.guardianNavMatches = incomingMatchRequests + reviewingBookings + poolSignal;
    guardianWorkspaceNavBadges.guardianNavProfile = 0;
    guardianWorkspaceNavBadges.guardianNavNewPost = 0;
    guardianWorkspaceNavBadges.guardianNavPoints = 0;
    guardianWorkspaceNavBadges.guardianNavSettings = 0;
    guardianWorkspaceNavSignatures.guardianNavHome = "guardianHome:none";
    guardianWorkspaceNavSignatures.guardianNavProfile = "guardianProfile:none";
    guardianWorkspaceNavSignatures.guardianNavNewPost = "guardianNewPost:none";
    guardianWorkspaceNavSignatures.guardianNavPoints = "guardianPoints:none";
    guardianWorkspaceNavSignatures.guardianNavSettings = "guardianSettings:none";
    guardianWorkspaceNavSignatures.guardianNavPosts = `guardianPosts:pending=${pendingPosts}:draft=${draftPosts}:recent=${recentPosts
      .map((p) => `${p.id}:${p.status}:${p.updatedAt}`)
      .join("|")}`;
    guardianWorkspaceNavSignatures.guardianNavMatches = `guardianMatches:incoming=${incomingMatchRequests}:reviewing=${reviewingBookings}:pool=${poolSignal}`;

    guardianWorkspaceBlockAttention = {
      incomingMatchRequests,
      bookingsReviewing: reviewingBookings,
      openPoolSignal: poolSignal,
      postsPendingReview: pendingPosts,
      postsDrafts: draftPosts,
    };

    guardianBadgeCount = Math.min(
      99,
      GUARDIAN_WORKSPACE_NAV_BADGE_KEYS.reduce((s, k) => s + guardianWorkspaceNavBadges[k], 0),
    );
  }

  return {
    travelerBadgeCount,
    guardianBadgeCount,
    guardianSegmentUnlocked,
    guardianOps,
    globalAttentionDot: travelerBadgeCount > 0 || guardianBadgeCount > 0,
    travelerNavBadges,
    travelerNavSignatures,
    guardianWorkspaceNavBadges,
    guardianWorkspaceNavSignatures,
    travelerBlockAttention,
    guardianWorkspaceBlockAttention,
  };
}
