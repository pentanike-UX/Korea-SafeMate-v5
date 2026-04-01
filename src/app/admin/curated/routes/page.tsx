import { V4_ROUTES } from "@/data/v4/routes";
import { CuratedRoutesAdminClient } from "@/components/admin/curated-routes-admin-client";

export default function AdminCuratedRoutesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Curated routes</h1>
        <p className="text-muted-foreground mt-1 text-sm">Mock editorial queue — status toggles are client-only for this MVP shell.</p>
      </div>
      <CuratedRoutesAdminClient initial={V4_ROUTES} />
    </div>
  );
}
