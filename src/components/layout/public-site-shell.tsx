import { GuardianRequestSheetGlobal } from "@/components/guardians/guardian-request-sheet";
import { SiteFooter } from "@/components/layout/site-footer";
import { V4MobileBottomNav } from "@/components/v4/v4-mobile-bottom-nav";
import { V4PublicHeader } from "@/components/v4/v4-public-header";

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <V4PublicHeader />
      <main className="flex-1 pb-[calc(var(--touch-target)+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      <SiteFooter />
      <V4MobileBottomNav />
      <GuardianRequestSheetGlobal />
    </>
  );
}
