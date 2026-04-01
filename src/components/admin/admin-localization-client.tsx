"use client";

const KEYS = [
  { key: "V4.home.heroTitle", samples: { en: "Movement, sequenced.", ko: "지금 이 시간에 잘 맞는 동선.", ja: "時間に合わせた動線。" } },
  { key: "V4.planner.title", samples: { en: "Build a route brief", ko: "동선 브리프 만들기", ja: "ルート概要を作る" } },
];

export function AdminLocalizationClient() {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-muted/50 border-b text-xs font-semibold uppercase">
          <tr>
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3">EN</th>
            <th className="px-4 py-3">KO</th>
            <th className="px-4 py-3">JA</th>
          </tr>
        </thead>
        <tbody>
          {KEYS.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="px-4 py-3 font-mono text-xs">{row.key}</td>
              <td className="px-4 py-3">{row.samples.en}</td>
              <td className="px-4 py-3">{row.samples.ko}</td>
              <td className="px-4 py-3">{row.samples.ja}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
