import { listPublishedV4Routes } from "@/data/v4";
import { listPublishedV4Stories } from "@/data/v4/stories";
import { AdminPublishPanelClient } from "@/components/admin/admin-publish-panel-client";

export default function AdminPublishPanelPage() {
  const routes = listPublishedV4Routes();
  const stories = listPublishedV4Stories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Publish panel</h1>
        <p className="text-muted-foreground mt-1 text-sm">Snapshot of public-ready curated content (seed data).</p>
      </div>
      <AdminPublishPanelClient routeCount={routes.length} storyCount={stories.length} />
    </div>
  );
}
