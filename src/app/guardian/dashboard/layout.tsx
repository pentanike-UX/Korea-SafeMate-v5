import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export default function GuardianDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/20 flex min-h-full flex-col">
      <header className="bg-background border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Guardian</p>
            <p className="text-sm font-medium">{BRAND.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-lg text-muted-foreground">
              <Link href="/services">Services</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/">Exit</Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
