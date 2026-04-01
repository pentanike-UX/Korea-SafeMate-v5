"use client";

import { useState } from "react";
import type { CuratedRoute } from "@/domain/curated-experience";
import { cn } from "@/lib/utils";

export function CuratedRoutesAdminClient({ initial }: { initial: CuratedRoute[] }) {
  const [rows, setRows] = useState(initial);

  const setStatus = (id: string, status: CuratedRoute["status"]) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs font-semibold tracking-wide uppercase">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="text-muted-foreground px-4 py-3 font-mono text-xs">{r.slug}</td>
              <td className="px-4 py-3 capitalize">{r.sourceType}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    r.status === "published" && "bg-[var(--success-soft)] text-[var(--success)]",
                    r.status === "ready" && "bg-[var(--info-soft)] text-[var(--info)]",
                    r.status === "draft" && "bg-muted text-muted-foreground",
                  )}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(["draft", "ready", "published"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(r.id, s)}
                      className="hover:bg-muted rounded-md border px-2 py-1 text-xs font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
