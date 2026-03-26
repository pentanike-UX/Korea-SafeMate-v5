import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FooterPreferences } from "@/components/layout/footer-preferences";
import { BRAND } from "@/lib/constants";

export async function SiteFooter() {
  const tFooter = await getTranslations("Footer");
  const tBrand = await getTranslations("Brand");
  const tNav = await getTranslations("Nav");
  const tHeader = await getTranslations("Header");

  const product = [
    { href: "/explore" as const, label: tNav("explore") },
    { href: "/posts" as const, label: tNav("posts") },
    { href: "/guardians" as const, label: tNav("guardians") },
    { href: "/mypage" as const, label: tHeader("myJourney") },
    { href: "/book" as const, label: tNav("book") },
  ];

  const guardians: { href: string; label: string }[] = [
    { href: "/guardians", label: tNav("guardians") },
    { href: "/guardians/apply", label: tFooter("apply") },
  ];

  const ops: { href: string; label: string; native?: boolean }[] = [
    { href: "/about", label: tNav("about") },
    { href: "/admin/dashboard", label: tFooter("adminConsoleLink"), native: true },
  ];

  return (
    <footer className="border-t border-white/10 bg-[#131a2a] text-white dark:bg-[#05070d]">
      <div className="w-full px-4 py-10 sm:px-6 sm:py-12 md:px-8 md:py-14 xl:px-10">
        <div className="grid gap-10 border-b border-white/12 pb-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-md">
            <p className="text-base font-semibold tracking-tight text-white">{BRAND.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80 sm:text-[15px]">{tBrand("tagline")}</p>
            <p className="mt-5 text-xs leading-relaxed text-white/58 sm:text-sm">{tFooter("disclaimerShort")}</p>
          </div>
          <nav className="contents" aria-label="Footer">
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-white/55 uppercase">{tFooter("product")}</p>
              <ul className="flex flex-col gap-1.5">
                {product.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] py-0.5 pr-1 text-sm font-medium text-white/78 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-white/55 uppercase">{tFooter("guardians")}</p>
              <ul className="flex flex-col gap-1.5">
                {guardians.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] py-0.5 pr-1 text-sm font-medium text-white/78 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-white/55 uppercase">{tFooter("operations")}</p>
              <ul className="flex flex-col gap-1.5">
                {ops.map(({ href, label, native }) => {
                  return (
                    <li key={href}>
                      {native ? (
                        <NextLink
                          href={href}
                          className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] py-0.5 pr-1 text-sm font-medium text-white/78 transition-colors hover:text-white"
                        >
                          {label}
                        </NextLink>
                      ) : (
                        <Link
                          href={href}
                          className="inline-flex min-h-9 items-center rounded-[var(--radius-md)] py-0.5 pr-1 text-sm font-medium text-white/78 transition-colors hover:text-white"
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <FooterPreferences />
            <NextLink
              href="/admin/dashboard"
              className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] px-1 text-xs font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline sm:text-sm"
            >
              {tFooter("adminConsoleLink")}
            </NextLink>
          </div>
          <p className="text-xs leading-relaxed text-white/55 sm:text-right sm:text-sm">{tFooter("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
