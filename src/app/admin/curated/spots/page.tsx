import { V4_SPOTS } from "@/data/v4/spots";

export default function AdminCuratedSpotsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Spots</h1>
        <p className="text-muted-foreground mt-1 text-sm">Route-linked places — read-only inventory from v4 seed.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-semibold uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Routes</th>
            </tr>
          </thead>
          <tbody>
            {V4_SPOTS.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{s.slug}</td>
                <td className="px-4 py-3">{s.district}</td>
                <td className="text-muted-foreground px-4 py-3 text-xs">{s.routeRefs.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
