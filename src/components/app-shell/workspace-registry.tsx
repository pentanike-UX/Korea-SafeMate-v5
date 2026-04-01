"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export type WorkspaceContextKey =
  | "home"
  | "explore"
  | "planner"
  | "planner-result"
  | "route-detail"
  | "spot-detail"
  | "story"
  | "saved"
  | "my"
  | "other";

export type WorkspaceRegistration = {
  contextKey: WorkspaceContextKey;
  panelTitle: string;
  panelSubtitle?: string;
  panelHeaderActions?: ReactNode;
  panelBody: ReactNode;
  /** Primary actions pinned above utility footer (save, navigate, etc.) */
  panelFooterPrimary?: ReactNode;
  stickyAction?: ReactNode;
  map: ReactNode;
  mapOverlays?: ReactNode;
  initialSheetSnap?: "collapsed" | "half" | "full";
};

type Ctx = {
  registration: WorkspaceRegistration | null;
  setRegistration: (r: WorkspaceRegistration | null) => void;
};

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistrationState] = useState<WorkspaceRegistration | null>(null);
  const setRegistration = useCallback((r: WorkspaceRegistration | null) => {
    setRegistrationState(r);
  }, []);

  const value = useMemo(() => ({ registration, setRegistration }), [registration, setRegistration]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used under WorkspaceProvider");
  return ctx;
}

/**
 * Binds page content into the workspace shell. Parent should memoize `registration` when map/panel are stable.
 */
export function WorkspaceBinder({ registration }: { registration: WorkspaceRegistration }) {
  const { setRegistration } = useWorkspace();
  useLayoutEffect(() => {
    setRegistration(registration);
    return () => setRegistration(null);
  }, [registration, setRegistration]);
  return null;
}
