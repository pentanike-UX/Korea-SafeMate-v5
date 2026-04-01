import { V4_GUARDIANS } from "@/data/v4/guardians";

export default function AdminCuratedGuardiansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guardian profiles (v4)</h1>
        <p className="text-muted-foreground mt-1 text-sm">Curated guide layer — aligns with public /guardians/guide/*.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/50 border-b text-xs font-semibold uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {V4_GUARDIANS.map((g) => (
              <tr key={g.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{g.displayName}</td>
                <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{g.slug}</td>
                <td className="px-4 py-3 capitalize">{g.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
