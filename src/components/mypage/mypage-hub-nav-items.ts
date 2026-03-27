import type { LucideIcon } from "lucide-react";
import { Coins, FolderOpen, HeartHandshake, Images, PenSquare, Plane, Settings, Users } from "lucide-react";

export type HubNavLabelKey =
  | "navOverview"
  | "navJourneys"
  | "navProfile"
  | "navPoints"
  | "navMatches"
  | "guardianNavProfile"
  | "guardianNavNewPost"
  | "guardianNavPosts"
  | "guardianNavMatches";

export type HubNavItem = {
  href: string;
  labelKey: HubNavLabelKey;
  Icon: LucideIcon;
  match: (pathname: string) => boolean;
};

function travelerOverviewMatch(p: string) {
  return p === "/mypage" || p === "/mypage/";
}

function travelerJourneysMatch(p: string) {
  return p === "/mypage/journeys" || p.startsWith("/mypage/journeys/");
}

function travelerProfileMatch(p: string) {
  return p === "/mypage/profile" || p.startsWith("/mypage/profile/");
}

function travelerPointsMatch(p: string) {
  return p === "/mypage/points" || p.startsWith("/mypage/points/");
}

function travelerMatchesMatch(p: string) {
  return p === "/mypage/matches" || p.startsWith("/mypage/matches/");
}

/** 여행자 허브 LNB — 요청·저장 흐름은 허브 요약·여정·매칭 화면에서 진입 (매칭과 역할 중복 방지). */
export const TRAVELER_HUB_NAV: HubNavItem[] = [
  { href: "/mypage", labelKey: "navJourneys", Icon: Plane, match: travelerOverviewMatch },
  { href: "/mypage/profile", labelKey: "navProfile", Icon: Settings, match: travelerProfileMatch },
  { href: "/mypage/points", labelKey: "navPoints", Icon: Coins, match: travelerPointsMatch },
  { href: "/mypage/matches", labelKey: "navMatches", Icon: Users, match: travelerMatchesMatch },
];

function guardianProfileMatch(p: string) {
  return p.startsWith("/mypage/guardian/profile");
}

function guardianPostsMatch(p: string) {
  return p.startsWith("/mypage/guardian/posts");
}

function guardianMatchesMatch(p: string) {
  return p.startsWith("/mypage/guardian/matches");
}

/** 가디언 운영 전용 — 마이페이지 허브 안에서만 이동 */
export const GUARDIAN_WORKSPACE_NAV: HubNavItem[] = [
  { href: "/mypage/guardian/profile/edit", labelKey: "guardianNavProfile", Icon: Images, match: guardianProfileMatch },
  {
    href: "/mypage/guardian/posts/new",
    labelKey: "guardianNavNewPost",
    Icon: PenSquare,
    match: (p) => p.startsWith("/mypage/guardian/posts/new"),
  },
  {
    href: "/mypage/guardian/posts",
    labelKey: "guardianNavPosts",
    Icon: FolderOpen,
    match: (p) => guardianPostsMatch(p) && !p.startsWith("/mypage/guardian/posts/new"),
  },
  { href: "/mypage/guardian/matches", labelKey: "guardianNavMatches", Icon: HeartHandshake, match: guardianMatchesMatch },
];

/** 승인된 가디언: 공통 여행자 허브 + 가디언 운영 링크 */
export const GUARDIAN_APPROVED_HUB_NAV: HubNavItem[] = [...TRAVELER_HUB_NAV, ...GUARDIAN_WORKSPACE_NAV];

export function resolveActiveNavLabel(pathname: string, items: HubNavItem[]): HubNavItem | null {
  const hit = items.find((i) => i.match(pathname));
  return hit ?? null;
}
