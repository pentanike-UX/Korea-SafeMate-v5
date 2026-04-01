"use client";

import { AppShell } from "@/components/app-shell/app-shell";
import { WorkspaceProvider } from "@/components/app-shell/workspace-registry";
import { GuardianRequestSheetGlobal } from "@/components/guardians/guardian-request-sheet";

/**
 * Map-first public routes: icon rail + context panel + full-screen map (desktop);
 * compact header + map + bottom sheet + tab bar (mobile).
 */
export function MapPrimaryShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="bg-[var(--bg-page)] text-foreground h-[100dvh] min-h-[100dvh] w-full overflow-hidden">
        <AppShell />
        {children}
      </div>
      <GuardianRequestSheetGlobal />
    </WorkspaceProvider>
  );
}
