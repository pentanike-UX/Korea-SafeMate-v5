"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { useRouter as useI18nRouter } from "@/i18n/navigation";
import { useRouter as useNextRouter } from "next/navigation";
import type { AppAccountRole } from "@/lib/auth/app-role";
import { isPrivilegedAppRole } from "@/lib/auth/app-role";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Heart, Shield, Sparkles, UserRound, Users, Wallet } from "lucide-react";

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
};

function initials(name: string, email: string) {
  const s = name.trim() || email;
  const parts = s.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return (s.slice(0, 2) || "U").toUpperCase();
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
        <p className={cn("truncate text-xs", onDarkSurface ? "text-white/75" : "text-muted-foreground")}>{email}</p>
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
  const i18nRouter = useI18nRouter();
  const nextRouter = useNextRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/me", { credentials: "include" });
      if (res.ok) setMe((await res.json()) as MeResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, authUser.id]);

  const handleSignOut = async () => {
    await fetch("/api/dev/mock-guardian-logout", { method: "POST", credentials: "include" });
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    setDesktopOpen(false);
    setMobileOpen(false);
    nextRouter.refresh();
  };

  const go = (path: string, close: () => void) => {
    close();
    if (path.startsWith("/admin")) {
      nextRouter.push(path);
      return;
    }
    i18nRouter.push(path);
  };

  const email = me?.auth.email ?? authUser.email ?? "";
  const display = me?.profile?.display_name?.trim() || me?.auth.sessionName || me?.user?.legal_name || email.split("@")[0] || "User";
  const avatarSrc = me?.profile?.profile_image_url || me?.user?.avatar_url || me?.auth.sessionAvatar || null;
  const role = me?.user?.app_role ?? "traveler";

  const triggerClass = cn(
    "inline-flex h-10 max-w-[min(100%,14rem)] items-center gap-2 rounded-[var(--radius-md)] border px-2.5 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
    onDarkSurface
      ? "border-white/25 bg-white/10 text-white hover:bg-white/16"
      : "border-border/80 bg-background hover:bg-muted/80",
  );

  const triggerInner = (
    <>
      <Avatar size="sm">
        {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
        <AvatarFallback className="text-[10px]">{initials(display, email)}</AvatarFallback>
      </Avatar>
      <span className={cn("min-w-0 flex-1 truncate", onDarkSurface ? "text-white" : "text-foreground")}>{email || display}</span>
      <ChevronDown className={cn("size-4 shrink-0 opacity-70", onDarkSurface ? "text-white" : "")} aria-hidden />
    </>
  );

  const menuItemsDesktop = (close: () => void) => {
    if (isPrivilegedAppRole(role)) {
      return (
        <>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/admin", close)}>
            <Shield className="size-4 opacity-80" aria-hidden />
            {t("accountAdminConsole")}
          </DropdownMenuItem>
          {role === "super_admin" ? (
            <DropdownMenuItem className="min-h-11" onSelect={() => go("/admin/managers/invite", close)}>
              <Shield className="size-4 opacity-80" aria-hidden />
              {t("accountSuperInvites")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="min-h-11" onSelect={() => void handleSignOut()}>
            {t("logOut")}
          </DropdownMenuItem>
        </>
      );
    }
    if (role === "guardian") {
      return (
        <>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage", close)}>
            <Sparkles className="size-4 opacity-80" aria-hidden />
            {t("accountMyJourney")}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/guardian/profile", close)}>
            <Users className="size-4 opacity-80" aria-hidden />
            {t("accountGuardianProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/guardian/posts", close)}>
            <FileText className="size-4 opacity-80" aria-hidden />
            {t("accountGuardianPosts")}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/guardian/matches", close)}>
            <Heart className="size-4 opacity-80" aria-hidden />
            {t("accountGuardianMatches")}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage/points", close)}>
            <Wallet className="size-4 opacity-80" aria-hidden />
            {t("accountPoints")}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage/profile", close)}>
            <UserRound className="size-4 opacity-80" aria-hidden />
            {t("accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="min-h-11" onSelect={() => void handleSignOut()}>
            {t("logOut")}
          </DropdownMenuItem>
        </>
      );
    }
    return (
      <>
        <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage", close)}>
          <Sparkles className="size-4 opacity-80" aria-hidden />
          {t("accountMyJourney")}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage/points", close)}>
          <Wallet className="size-4 opacity-80" aria-hidden />
          {t("accountPoints")}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => go("/mypage/profile", close)}>
          <UserRound className="size-4 opacity-80" aria-hidden />
          {t("accountSettings")}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => go("/guardians/apply", close)}>
          <Shield className="size-4 opacity-80" aria-hidden />
          {t("accountGuardianApply")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="min-h-11" onSelect={() => void handleSignOut()}>
          {t("logOut")}
        </DropdownMenuItem>
      </>
    );
  };

  const row =
    "hover:bg-accent focus-visible:bg-accent flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left text-base font-medium text-foreground outline-none transition-colors";

  const menuItemsMobile = (close: () => void) => {
    if (isPrivilegedAppRole(role)) {
      return (
        <nav className="flex flex-col gap-1 px-2" aria-label={t("accountMenuTitle")}>
          <button type="button" className={row} onClick={() => go("/admin", close)}>
            <Shield className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountAdminConsole")}
          </button>
          {role === "super_admin" ? (
            <button type="button" className={row} onClick={() => go("/admin/managers/invite", close)}>
              <Shield className="size-5 shrink-0 opacity-80" aria-hidden />
              {t("accountSuperInvites")}
            </button>
          ) : null}
          <div className="border-border/60 my-2 border-t" />
          <button
            type="button"
            className={cn(row, "text-destructive hover:bg-destructive/10")}
            onClick={() => void handleSignOut()}
          >
            {t("logOut")}
          </button>
        </nav>
      );
    }
    if (role === "guardian") {
      return (
        <nav className="flex flex-col gap-1 px-2" aria-label={t("accountMenuTitle")}>
          <button type="button" className={row} onClick={() => go("/mypage", close)}>
            <Sparkles className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountMyJourney")}
          </button>
          <button type="button" className={row} onClick={() => go("/guardian/profile", close)}>
            <Users className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountGuardianProfile")}
          </button>
          <button type="button" className={row} onClick={() => go("/guardian/posts", close)}>
            <FileText className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountGuardianPosts")}
          </button>
          <button type="button" className={row} onClick={() => go("/guardian/matches", close)}>
            <Heart className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountGuardianMatches")}
          </button>
          <button type="button" className={row} onClick={() => go("/mypage/points", close)}>
            <Wallet className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountPoints")}
          </button>
          <button type="button" className={row} onClick={() => go("/mypage/profile", close)}>
            <UserRound className="size-5 shrink-0 opacity-80" aria-hidden />
            {t("accountSettings")}
          </button>
          <div className="border-border/60 my-2 border-t" />
          <button
            type="button"
            className={cn(row, "text-destructive hover:bg-destructive/10")}
            onClick={() => void handleSignOut()}
          >
            {t("logOut")}
          </button>
        </nav>
      );
    }
    return (
      <nav className="flex flex-col gap-1 px-2" aria-label={t("accountMenuTitle")}>
        <button type="button" className={row} onClick={() => go("/mypage", close)}>
          <Sparkles className="size-5 shrink-0 opacity-80" aria-hidden />
          {t("accountMyJourney")}
        </button>
        <button type="button" className={row} onClick={() => go("/mypage/points", close)}>
          <Wallet className="size-5 shrink-0 opacity-80" aria-hidden />
          {t("accountPoints")}
        </button>
        <button type="button" className={row} onClick={() => go("/mypage/profile", close)}>
          <UserRound className="size-5 shrink-0 opacity-80" aria-hidden />
          {t("accountSettings")}
        </button>
        <button type="button" className={row} onClick={() => go("/guardians/apply", close)}>
          <Shield className="size-5 shrink-0 opacity-80" aria-hidden />
          {t("accountGuardianApply")}
        </button>
        <div className="border-border/60 my-2 border-t" />
        <button
          type="button"
          className={cn(row, "text-destructive hover:bg-destructive/10")}
          onClick={() => void handleSignOut()}
        >
          {t("logOut")}
        </button>
      </nav>
    );
  };

  return (
    <>
      <div className="hidden sm:block">
        <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
          <DropdownMenuTrigger
            className={triggerClass}
            aria-label={t("accountMenuAria")}
            aria-expanded={desktopOpen}
            aria-haspopup="menu"
          >
            {loading ? <span className="text-muted-foreground px-2 text-xs">…</span> : triggerInner}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),20rem)] p-0" sideOffset={6}>
            <AccountSummary me={me} authUser={authUser} onDarkSurface={false} />
            <div className="p-1">{menuItemsDesktop(() => setDesktopOpen(false))}</div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="sm:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className={triggerClass} aria-label={t("accountMenuAria")} aria-expanded={mobileOpen}>
            {loading ? <span className="text-muted-foreground px-2 text-xs">…</span> : triggerInner}
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
