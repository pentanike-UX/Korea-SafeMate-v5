import Link from "next/link";
import { mockServiceTypes } from "@/data/mock";
import { SERVICE_COPY } from "@/lib/constants";
import { TrustBoundaryCard } from "@/components/trust/trust-boundary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Services | Korea SafeMate",
  description: "Arrival, K-Route, and First 24 Hours companion support in Seoul.",
};

function formatKrw(n: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Companion services</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          Fixed-scope support sessions. Pricing shown is indicative for MVP planning — final quotes
          may vary by distance and timing.
          {/* TODO(prod): Pull live pricing & availability from Supabase + admin config. */}
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {mockServiceTypes.map((s) => {
          const copy = SERVICE_COPY[s.code];
          return (
            <Card key={s.code} className="flex flex-col border-primary/10 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    ~{s.duration_hours}h
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {s.short_description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-4">
                <ul className="text-muted-foreground space-y-2 text-sm">
                  {copy.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
                <p className="text-foreground text-sm font-semibold">
                  From {formatKrw(s.base_price_krw)}
                </p>
                <Button asChild className="w-full rounded-xl sm:w-auto">
                  <Link href={`/book?service=${s.code}`}>Select & book</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-14">
        <TrustBoundaryCard />
      </div>
    </div>
  );
}
