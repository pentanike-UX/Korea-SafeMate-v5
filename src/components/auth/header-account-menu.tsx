"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import type { AppAccountRole } from "@/lib/auth/app-role";
import { sameOriginApiUrl } from "@/lib/api-origin";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { HeaderAttentionDot } from "@/components/mypage/mypage-attention-primitives";
import { MYPAGE_ATTENTION_UPDATED_EVENT } from "@/lib/mypage-attention-events";
import { broadcastClientAuthContextChanged } from "@/lib/auth/client-auth-tab-sync";
import { invalidateClientPointsCache } from "@/lib/points/client-points-fetch-cache";
import type { GuardianWorkspaceNavBadgeKey, TravelerNavBadgeKey } from "@/types/mypage-hub";
import { ChevronDown } from "lucide-react";

type MeResponse = {
  auth: { id: string; email: string | undefined; sessionAvatar: string | null; sessionName: string };
  user: {
    id: string;
    email: string;
    app_role: AppAccountRole;
    avatar_url: string | null;
    legal_name: string | null;
    last_login_at: string | null;
    created_at: string;
    auth_provider: string;
  } | null;
  profile: {
    display_name: string | null;
    profile_image_url: string | null;
    intro: string | null;
  } | null;
  attention?: {
    globalAttentionDot: boolean;
    travelerNavBadges: Record<TravelerNavBadgeKey, number>;
    travelerNavSignatures: Record<TravelerNavBadgeKey, string>;
    guardianWorkspaceNavBadges: Record<GuardianWorkspaceNavBadgeKey, number>;
    guardianWorkspaceNavSignatures: Record<GuardianWorkspaceNavBadgeKey, string>;
  };
};

function initials(name: string, email: string) {
  const s = name.trim() || email;
  const parts = s.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return (s.slice(0, 2) || "U").toUpperCase();
}

function emailLocalPart(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email.slice(0, 20);
  return email.slice(0, at);
}

function desktopTriggerLabel(display: string, email: string) {
  const d = display.trim();
  if (d) return d;
  if (email) return emailLocalPart(email);
  return "User";
}

/** 모바일 트리거: 긴 이메일 전체 노출 금지 — 표시명·이니셜 위주 */
function mobileTriggerLabel(display: string, email: string) {
  const d = display.trim();
  if (d.length > 0) {
    if (d.length <= 14) return d;
    return `${d.slice(0, 12)}…`;
  }
  if (email) {
    const local = emailLocalPart(email);
    if (local.length <= 10) return local;
    return `${local.slice(0, 8)}…`;
  }
  return initials(display, email);
}

function roleTKey(role: AppAccountRole): "role_traveler" | "role_guardian" | "role_admin" | "role_super_admin" {
  if (role === "guardian") return "role_guardian";
  if (role === "admin") return "role_admin";
  if (role === "super_admin") return "role_super_admin";
  return "role_traveler";
}

function AccountSummary({
  me,
  authUser,
  onDarkSurface,
}: {
  me: MeResponse | null;
  authUser: User;
  onDarkSurface: boolean;
}) {
  const t = useTranslations("Header");
  const email = me?.auth.email ?? authUser.email ?? "";
  const display = me?.profile?.display_name?.trim() || me?.auth.sessionName || me?.user?.legal_name || email.split("@")[0] || "User";
  const avatarSrc = me?.profile?.profile_image_url || me?.user?.avatar_url || me?.auth.sessionAvatar || null;
  const role = me?.user?.app_role ?? "traveler";

  return (
    <div
      className={cn(
        "flex gap-3 border-b px-3 py-3",
        onDarkSurface ? "border-white/15" : "border-border/60",
      )}
    >
      <Avatar size="lg" className="ring-2 ring-background">
        {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
        <AvatarFallback>{initials(display, email)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", onDarkSurface ? "text-white" : "text-foreground")}>{display}</p>
        <p
          className={cn("truncate text-xs", onDarkSurface ? "text-white/75" : "text-muted-foreground")}
          title={email || undefined}
        >
          {email ? (email.length > 36 ? `${email.slice(0, 34)}…` : email) : ""}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px] font-medium tracking-wide uppercase",
            onDarkSurface ? "text-white/55" : "text-muted-foreground",
          )}
        >
          {t("accountRoleLabel")}: {t(roleTKey(role))}
        </p>
      </div>
    </div>
  );
}

export function HeaderAccountMenu({
  authUser,
  onDarkSurface,
}: {
  authUser: User;
  onDarkSurface: boolean;
}) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(sameOriginApiUrl("/api/account/me"), { credentials: "include" });
      if (res.ok) setMe((await res.json()) as MeResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, authUser.id]);

  useEffect(() => {
    const onAttention = () => {
      void load();
    };
    window.addEventListener(MYPAGE_ATTENTION_UPDATED_EVENT, onAttention);
    return () => window.removeEventListener(MYPAGE_ATTENTION_UPDATED_EVENT, onAttention);
  }, [load]);

  const publicChatHref = locale === routing.defaultLocale ? "/chat" : `/${locale}/chat`;

  const handleSignOut = async (close: () => void) => {
    close();
    invalidateClientPointsCache();
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    broadcastClientAuthContextChanged();
    setDesktopOpen(false);
    setMobileOpen(false);
    window.location.href = publicChatHref;
  };

  const email = me?.auth.email ?? authUser.email ?? "";
  const display = me?.profile?.display_name?.trim() || me?.auth.sessionName || me?.user?.legal_name || email.split("@")[0] || "User";
  const avatarSrc = me?.profile?.profile_image_url || me?.user?.avatar_url || me?.auth.sessionAvatar || null;

  const triggerClassBase =
    "inline-flex h-9 min-h-9 min-w-0 items-center gap-1.5 rounded-[var(--radius-md)] border text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

  const triggerClassDesktop = cn(
    triggerClassBase,
    "max-w-[min(100%,15rem)] px-2.5",
    onDarkSurface
      ? "border-white/25 bg-white/10 text-white hover:bg-white/16"
      : "border-border/80 bg-background hover:bg-muted/80",
  );

  const triggerClassMobile = cn(
    triggerClassBase,
    "max-w-[min(100%,5.75rem)] px-1.5 min-[360px]:max-w-[min(100%,9rem)] min-[360px]:px-2 sm:max-w-[min(100%,12rem)] sm:px-2",
    onDarkSurface
      ? "border-white/25 bg-white/10 text-white hover:bg-white/16"
      : "border-border/80 bg-background hover:bg-muted/80",
  );

  const deskLabel = desktopTriggerLabel(display, email);
  const mobLabel = mobileTriggerLabel(display, email);

  const showAttentionDot = Boolean(me?.attention?.globalAttentionDot);

  const triggerInnerDesktop = (
    <>
      <span className="relative shrink-0">
        <Avatar size="sm">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
          <AvatarFallback className="text-[10px]">{initials(display, email)}</AvatarFallback>
        </Avatar>
        {showAttentionDot ? (
          <span className="absolute -top-0.5 -right-0.5">
            <HeaderAttentionDot />
          </span>
        ) : null}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", onDarkSurface ? "text-white" : "text-foreground")} title={deskLabel}>
        {deskLabel}
      </span>
      <ChevronDown className={cn("size-4 shrink-0 opacity-70", onDarkSurface ? "text-white" : "")} aria-hidden />
    </>
  );

  const triggerInnerMobile = (
    <>
      <span className="relative shrink-0">
        <Avatar size="sm">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
          <AvatarFallback className="text-[10px]">{initials(display, email)}</AvatarFallback>
        </Avatar>
        {showAttentionDot ? (
          <span className="absolute -top-0.5 -right-0.5">
            <HeaderAttentionDot />
          </span>
        ) : null}
      </span>
      <span
        className={cn("min-w-0 flex-1 truncate text-xs", onDarkSurface ? "text-white" : "text-foreground")}
        title={mobLabel}
      >
        {mobLabel}
      </span>
      <ChevronDown className={cn("size-4 shrink-0 opacity-70", onDarkSurface ? "text-white" : "")} aria-hidden />
    </>
  );

  const menuItemsDesktop = (close: () => void) => (
    <DropdownMenuItem
      variant="destructive"
      className="min-h-11"
      onClick={(e) => {
        e.preventDefault();
        void handleSignOut(close);
      }}
    >
      {t("logOut")}
    </DropdownMenuItem>
  );

  const row =
    "hover:bg-accent focus-visible:bg-accent flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left text-base font-medium text-foreground outline-none transition-colors";

  const menuItemsMobile = (close: () => void) => (
    <nav className="flex flex-col gap-1 px-2" aria-label={t("accountMenuTitle")}>
      <button
        type="button"
        className={cn(row, "text-destructive hover:bg-destructive/10")}
        onClick={() => void handleSignOut(close)}
      >
        {t("logOut")}
      </button>
    </nav>
  );

  return (
    <>
      <div className="hidden sm:block">
        <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
          <DropdownMenuTrigger
            className={triggerClassDesktop}
            aria-label={t("accountMenuAria")}
            aria-expanded={desktopOpen}
            aria-haspopup="menu"
          >
            {loading ? (
              <span className="text-muted-foreground px-2 text-xs">…</span>
            ) : (
              <>
                {showAttentionDot ? <span className="sr-only">{t("attentionDotAria")}</span> : null}
                {triggerInnerDesktop}
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),20rem)] p-0" sideOffset={6}>
            <AccountSummary me={me} authUser={authUser} onDarkSurface={false} />
            <div className="p-1">{menuItemsDesktop(() => setDesktopOpen(false))}</div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="sm:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className={triggerClassMobile} aria-label={t("accountMenuAria")} aria-expanded={mobileOpen}>
            {loading ? (
              <span className="text-muted-foreground px-2 text-xs">…</span>
            ) : (
              <>
                {showAttentionDot ? <span className="sr-only">{t("attentionDotAria")}</span> : null}
                {triggerInnerMobile}
              </>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[min(85vh,32rem)] rounded-t-2xl px-0 pt-4 pb-6">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("accountMenuTitle")}</SheetTitle>
            </SheetHeader>
            <AccountSummary me={me} authUser={authUser} onDarkSurface={false} />
            {menuItemsMobile(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
