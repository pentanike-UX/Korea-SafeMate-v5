import Link from "next/link";
import { BRAND, PRODUCT_LAYERS, SERVICE_COPY } from "@/lib/constants";
import { TrustBoundaryCard } from "@/components/trust/trust-boundary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Plane, MapPin, Sun } from "lucide-react";

const icons = {
  arrival: Plane,
  k_route: MapPin,
  first_24h: Sun,
} as const;

export default function HomePage() {
  return (
    <div>
      <section className="from-muted/40 via-background to-background relative overflow-hidden bg-gradient-to-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase">
            Korea · inbound & local discovery
          </p>
          <h1 className="text-foreground mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Trustworthy local intelligence and calm, scoped support.
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
            {BRAND.name} combines moderated regional intel, a tiered Guardian community with mutual
            reviews, and ops-gated matching for practical help — for foreign visitors and Korean
            users exploring domestically. Not a forum dump or generic tour marketplace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-xl px-8">
              <Link href="/explore">
                Explore regions
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/book">Book support</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/services">Services</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-6 max-w-lg text-xs leading-relaxed">
            Not emergency response, medical, or legal advice. Scope and exclusions are shown before
            you book.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">Three layers, one platform</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Open participation for intel; separate verification for matching; external chat handoff
            in the MVP — clarity over hype.
          </p>
        </div>
        <div className="mb-12 grid gap-4 md:grid-cols-3">
          {PRODUCT_LAYERS.map((layer) => (
            <Card key={layer.title} className="border-primary/10 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">{layer.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{layer.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">Support sessions</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Arrival, K-route execution, and first-day adaptation — scoped companion help, not
            licensed tour commentary.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(SERVICE_COPY) as Array<keyof typeof SERVICE_COPY>).map((code) => {
            const copy = SERVICE_COPY[code];
            const Icon = icons[code];
            return (
              <Card
                key={code}
                className="border-primary/10 shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="text-primary mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{copy.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {copy.bullets[0]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    {copy.bullets.slice(1).map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                  <Button asChild variant="link" className="mt-4 h-auto px-0">
                    <Link href="/book">Start booking →</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <TrustBoundaryCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="bg-primary text-primary-foreground flex flex-col items-start justify-between gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ready to reduce first-day friction?
            </h2>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              Tell us your arrival window and needs. Our team reviews every request and matches a
              Guardian when availability aligns.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="rounded-xl text-primary shrink-0"
          >
            <Link href="/book">Book now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
