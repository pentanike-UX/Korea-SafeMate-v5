import type { AppAccountRole } from "@/lib/auth/app-role";
import type { GuardianProfileStatus } from "@/lib/auth/guardian-profile-status";

export type GuardianRecentPostLine = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type GuardianOpsSnapshot = {
  pendingPosts: number;
  draftPosts: number;
  reviewingBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  openPoolCount: number;
  points: number | null;
  recentPosts: GuardianRecentPostLine[];
};

/** LNB 여행자 메뉴 키 — `mypage-hub-nav-items` TRAVELER_HUB_NAV.labelKey 와 동일 */
export const TRAVELER_NAV_BADGE_KEYS = ["navJourneys", "navProfile", "navPoints", "navMatches"] as const;
export type TravelerNavBadgeKey = (typeof TRAVELER_NAV_BADGE_KEYS)[number];

/** 가디언 워크스페이스 LNB — GUARDIAN_WORKSPACE_NAV.labelKey */
export const GUARDIAN_WORKSPACE_NAV_BADGE_KEYS = [
  "guardianNavHome",
  "guardianNavProfile",
  "guardianNavNewPost",
  "guardianNavPosts",
  "guardianNavMatches",
  "guardianNavPoints",
  "guardianNavSettings",
] as const;
export type GuardianWorkspaceNavBadgeKey = (typeof GUARDIAN_WORKSPACE_NAV_BADGE_KEYS)[number];

/** 화면 블록 단위 안내(세그먼트·메뉴 배지와 동일 데이터 소스) */
export type TravelerBlockAttention = {
  /** 여정 요청(MVP mock) — reviewing | requested */
  openTripRequests: number;
  matches: {
    pending: number;
    reviewDue: number;
    accepted: number;
  };
  /** 최근 7일 포인트 원장 건수(실제 DB); mock 계정은 0 */
  pointsRecentLedgerCount: number;
  /** 저장 가디언 수 — 시그니처·블록 배지용 (쿠키/샘플) */
  savedGuardianCount: number;
  /** 저장 포스트 수 — 시그니처·블록 배지용 (샘플 또는 추후 DB) */
  savedPostCount: number;
};

export type GuardianWorkspaceBlockAttention = {
  incomingMatchRequests: number;
  bookingsReviewing: number;
  openPoolSignal: number;
  postsPendingReview: number;
  postsDrafts: number;
};

export type MypageHubSnapshot = {
  travelerBadgeCount: number;
  guardianBadgeCount: number;
  guardianSegmentUnlocked: boolean;
  guardianOps: GuardianOpsSnapshot | null;
  /** 헤더 dot — traveler 또는 guardian 배지가 하나라도 있을 때 */
  globalAttentionDot: boolean;
  travelerNavBadges: Record<TravelerNavBadgeKey, number>;
  travelerNavSignatures: Record<TravelerNavBadgeKey, string>;
  guardianWorkspaceNavBadges: Record<GuardianWorkspaceNavBadgeKey, number>;
  guardianWorkspaceNavSignatures: Record<GuardianWorkspaceNavBadgeKey, string>;
  travelerBlockAttention: TravelerBlockAttention;
  guardianWorkspaceBlockAttention: GuardianWorkspaceBlockAttention | null;
};

export type AttentionMenuKey = TravelerNavBadgeKey | GuardianWorkspaceNavBadgeKey;

export type MypageHubAttentionView = {
  unreadTravelerNavBadges: Record<TravelerNavBadgeKey, number>;
  unreadGuardianWorkspaceNavBadges: Record<GuardianWorkspaceNavBadgeKey, number>;
  unreadTravelerBadgeCount: number;
  unreadGuardianBadgeCount: number;
  unreadGlobalAttentionDot: boolean;
};

export type MypageHubContextValue = {
  appRole: AppAccountRole;
  guardianStatus: GuardianProfileStatus;
  accountUserId: string | null;
  snapshot: MypageHubSnapshot;
  attention: MypageHubAttentionView;
};
