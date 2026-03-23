import Link from "next/link";
import { BRAND } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">{BRAND.name}</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-relaxed">
              {BRAND.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="text-foreground font-medium">Product</p>
              <ul className="text-muted-foreground mt-2 space-y-2">
                <li>
                  <Link href="/explore" className="hover:text-foreground">
                    Explore
                  </Link>
                </li>
                <li>
                  <Link href="/guardians" className="hover:text-foreground">
                    Guardians
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="hover:text-foreground">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="/book" className="hover:text-foreground">
                    Book
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-medium">Guardians</p>
              <ul className="text-muted-foreground mt-2 space-y-2">
                <li>
                  <Link href="/guardians/apply" className="hover:text-foreground">
                    Apply
                  </Link>
                </li>
                <li>
                  <Link href="/guardian/dashboard" className="hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-foreground font-medium">Operations</p>
              <ul className="text-muted-foreground mt-2 space-y-2">
                <li>
                  <Link href="/admin" className="hover:text-foreground">
                    Admin
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-8 border-t pt-6 text-xs leading-relaxed">
          Companion support only. Not medical, legal, or emergency services. No claim of 24/7
          protection or guaranteed safety. By using Korea SafeMate you acknowledge these limits.
        </p>
      </div>
    </footer>
  );
}
