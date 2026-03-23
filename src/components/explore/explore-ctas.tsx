import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ExploreCtas() {
  return (
    <section className="bg-muted/30 border-y">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-foreground text-sm font-medium">Ready for the next step?</p>
          <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-relaxed">
            Browse intel first — then book scoped support or start contributing as a Guardian.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <Button asChild className="rounded-xl">
            <Link href="/book">Book support</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/guardians/apply">Become a Guardian</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/guardians">Guardian profiles</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
