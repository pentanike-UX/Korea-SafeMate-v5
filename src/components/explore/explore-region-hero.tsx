import Link from "next/link";
import type { Region } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = { region: Region };

export function ExploreRegionHero({ region }: Props) {
  return (
    <section className="from-muted/40 via-background to-background border-b bg-gradient-to-b">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 h-auto px-2 text-muted-foreground">
          <Link href="/explore">← Explore home</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={region.phase === 1 ? "default" : "secondary"}>Phase {region.phase}</Badge>
          <span className="text-muted-foreground text-sm">{region.name_ko}</span>
        </div>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {region.name}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
          {region.short_description}
        </p>
        <p className="text-foreground mt-6 max-w-3xl text-sm leading-relaxed">{region.detail_blurb}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild className="rounded-xl">
            <Link href="/book">Book support in this area</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/guardians/apply">Contribute intel</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
