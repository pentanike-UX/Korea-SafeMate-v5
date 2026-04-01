"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { AccountDrawer } from "@/components/app-shell/account-drawer";
import { BottomSheet } from "@/components/app-shell/bottom-sheet";
import { BottomTabBar } from "@/components/app-shell/bottom-tab-bar";
import { CompactWorkspaceHeader } from "@/components/app-shell/compact-workspace-header";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { FullScreenMap } from "@/components/app-shell/full-screen-map";
import { HelpSheet } from "@/components/app-shell/help-sheet";
import { IconRail } from "@/components/app-shell/icon-rail";
import { InfoDrawer } from "@/components/app-shell/info-drawer";
import { LanguageSheet } from "@/components/app-shell/language-sheet";
import { PanelBody } from "@/components/app-shell/panel-body";
import { PanelFooterUtility } from "@/components/app-shell/panel-footer-utility";
import { PanelHeader } from "@/components/app-shell/panel-header";
import { StickyActionBar } from "@/components/app-shell/sticky-action-bar";
import { useWorkspace } from "@/components/app-shell/workspace-registry";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function PanelSkeleton() {
  const t = useTranslations("V4.workspace.shell");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border/50 border-b px-5 py-4">
        <div className="bg-muted h-5 w-2/3 max-w-[14rem] rounded-lg" />
        <div className="bg-muted mt-2 h-3 w-full max-w-[18rem] rounded-lg opacity-70" />
      </div>
      <PanelBody>
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      </PanelBody>
    </div>
  );
}

export function AppShell() {
  const { registration } = useWorkspace();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = () => setHelpOpen(true);
  const openLanguage = () => setLanguageOpen(true);
  const openAccount = () => setAccountOpen(true);
  const openInfo = () => setInfoOpen(true);

  const title = registration?.panelTitle ?? "";
  const snap = registration?.initialSheetSnap ?? "half";

  const utilityFooter = registration ? (
    <PanelFooterUtility
      onAccount={openAccount}
      onLanguage={openLanguage}
      onHelp={openHelp}
      onInfo={openInfo}
    />
  ) : null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden h-full min-h-0 w-full min-w-0 lg:flex">
        <IconRail
          pathname={pathname}
          onOpenHelp={openHelp}
          onOpenInfo={openInfo}
          onOpenLanguage={openLanguage}
          onOpenAccount={openAccount}
        />
        <div
          className={cn(
            "border-border/55 bg-[var(--bg-surface)] flex h-full min-h-0 w-[min(420px,max(360px,32vw))] shrink-0 flex-col border-r",
            "shadow-[8px_0_40px_rgba(15,23,42,0.04)]",
          )}
        >
          {registration ? (
            <ContextPanel
              title={registration.panelTitle}
              subtitle={registration.panelSubtitle}
              headerActions={registration.panelHeaderActions}
              stickyAction={registration.stickyAction}
              panelFooterPrimary={registration.panelFooterPrimary}
              onAccount={openAccount}
              onLanguage={openLanguage}
              onHelp={openHelp}
              onInfo={openInfo}
            >
              {registration.panelBody}
            </ContextPanel>
          ) : (
            <PanelSkeleton />
          )}
        </div>
        <FullScreenMap overlays={registration?.mapOverlays}>
          {registration?.map ?? <div className="bg-[var(--bg-page)] h-full w-full" />}
        </FullScreenMap>
      </div>

      {/* Mobile */}
      <div className="relative h-full min-h-0 w-full min-w-0 lg:hidden">
        <FullScreenMap overlays={registration?.mapOverlays} className="!absolute inset-0">
          {registration?.map ?? <div className="bg-[var(--bg-page)] h-full w-full" />}
        </FullScreenMap>
        <CompactWorkspaceHeader title={title || "…"} />
        <BottomSheet footer={utilityFooter} initialSnap={snap}>
          {registration ? (
            <>
              <PanelHeader
                title={registration.panelTitle}
                subtitle={registration.panelSubtitle}
                actions={registration.panelHeaderActions}
                className="border-0 pb-2"
              />
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">{registration.panelBody}</div>
              <StickyActionBar className="border-border/50 border-t">{registration.stickyAction}</StickyActionBar>
              {registration.panelFooterPrimary ? (
                <div className="border-border/50 border-t px-4 py-3">{registration.panelFooterPrimary}</div>
              ) : null}
            </>
          ) : (
            <PanelSkeleton />
          )}
        </BottomSheet>
        <BottomTabBar />
      </div>

      <AccountDrawer open={accountOpen} onOpenChange={setAccountOpen} />
      <InfoDrawer open={infoOpen} onOpenChange={setInfoOpen} />
      <LanguageSheet open={languageOpen} onOpenChange={setLanguageOpen} />
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
