import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { V4_GUARDIANS } from "@/data/v4/guardians";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.guardians");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function GuardiansPage() {
  const t = await getTranslations("V4.guardians");

  return (
    <div className="bg-[var(--bg-page)] page-container py-10 pb-24 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t("lead")}</p>
      </header>
      <ul className="mt-12 grid gap-6 md:grid-cols-2">
        {V4_GUARDIANS.map((g) => (
          <li key={g.id}>
            <article className="bg-card ring-border/60 flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] ring-1">
              <div className="relative aspect-[16/9] w-full">
                <Image src={g.cover} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--border-default)]">
                    <Image src={g.avatar} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                  <div>
                    <h2 className="text-[var(--text-strong)] text-lg font-semibold">{g.displayName}</h2>
                    <p className="text-muted-foreground text-sm">{g.languages.join(" · ")}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4 line-clamp-3 flex-1 text-sm leading-relaxed">{g.shortBio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {g.specialtyVibes.slice(0, 4).map((v) => (
                    <span key={v} className="bg-[var(--brand-primary-soft)] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                      {v}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href={`/guardians/guide/${g.slug}`}
                    className="bg-[var(--text-strong)] text-[var(--text-on-brand)] inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] px-5 text-sm font-semibold"
                  >
                    {t("viewProfile")}
                  </Link>
                  <Link
                    href={`/guardians/guide/${g.slug}/request`}
                    className="text-[var(--brand-trust-blue)] hover:text-[var(--brand-trust-blue-hover)] inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] px-4 text-sm font-semibold"
                  >
                    {t("ask")}
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
