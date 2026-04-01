import { AdminLocalizationClient } from "@/components/admin/admin-localization-client";

export default function AdminLocalizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Localization</h1>
        <p className="text-muted-foreground mt-1 text-sm">Preview v4 message keys — production source remains JSON locale files.</p>
      </div>
      <AdminLocalizationClient />
    </div>
  );
}
