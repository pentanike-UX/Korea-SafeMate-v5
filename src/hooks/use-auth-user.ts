"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { buildMockSupabaseUser, readMockGuardianIdFromDocumentCookie } from "@/lib/dev/mock-guardian-auth";
import { invalidateClientPointsCache } from "@/lib/points/client-points-fetch-cache";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/** `undefined` = 아직 확인 전, `null` = 비로그인 */
export function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const prevUserIdRef = { current: undefined as string | null | undefined };

    const applySessionUser = (next: User | null) => {
      const nextId = next?.id ?? null;
      const prev = prevUserIdRef.current;
      if (prev !== undefined) {
        if (nextId === null || (prev !== null && nextId !== prev)) {
          invalidateClientPointsCache();
        }
      }
      prevUserIdRef.current = nextId;
      setUser(next);
    };

    const mockId = readMockGuardianIdFromDocumentCookie();
    if (mockId) {
      const u = buildMockSupabaseUser(mockId);
      applySessionUser(u);
      return;
    }

    const sb = createSupabaseBrowserClient();
    if (!sb) {
      applySessionUser(null);
      return;
    }

    void sb.auth.getSession().then(({ data }) => {
      applySessionUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      const mid = readMockGuardianIdFromDocumentCookie();
      if (mid) {
        applySessionUser(buildMockSupabaseUser(mid));
        return;
      }
      applySessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
