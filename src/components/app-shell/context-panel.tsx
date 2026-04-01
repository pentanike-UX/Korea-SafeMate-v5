"use client";

import { PanelBody } from "@/components/app-shell/panel-body";
import { PanelFooterUtility } from "@/components/app-shell/panel-footer-utility";
import { PanelHeader } from "@/components/app-shell/panel-header";
import { StickyActionBar } from "@/components/app-shell/sticky-action-bar";
import { cn } from "@/lib/utils";

export function ContextPanel({
  title,
  subtitle,
  headerActions,
  children,
  stickyAction,
  panelFooterPrimary,
  onAccount,
  onLanguage,
  onHelp,
  onInfo,
  className,
}: {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  stickyAction?: React.ReactNode;
  panelFooterPrimary?: React.ReactNode;
  onAccount: () => void;
  onLanguage: () => void;
  onHelp: () => void;
  onInfo: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-surface)]", className)}>
      <PanelHeader title={title} subtitle={subtitle} actions={headerActions} />
      <PanelBody>{children}</PanelBody>
      <StickyActionBar>{stickyAction}</StickyActionBar>
      {panelFooterPrimary ? (
        <div className="border-border/50 shrink-0 border-t px-5 py-3">{panelFooterPrimary}</div>
      ) : null}
      <PanelFooterUtility onAccount={onAccount} onLanguage={onLanguage} onHelp={onHelp} onInfo={onInfo} />
    </div>
  );
}
