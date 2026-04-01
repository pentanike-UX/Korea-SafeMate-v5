import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { listPublishedV4Stories } from "@/data/v4/stories";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.stories");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function StoriesPage() {
  const t = await getTranslations("V4.stories");
  const stories = listPublishedV4Stories();

  return (
    <div className="bg-[var(--bg-page)] page-container py-10 pb-24 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{t("lead")}</p>
      </header>
      <ul className="mt-12 space-y-6">
        {stories.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/stories/${s.slug}`}
              className="bg-card ring-border/60 group flex flex-col overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] ring-1 transition-shadow duration-300 hover:shadow-[var(--shadow-md)] sm:flex-row"
            >
              <div className="relative aspect-[16/10] w-full shrink-0 sm:aspect-auto sm:w-72">
                <Image src={s.coverImage} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" sizes="(max-width:640px) 100vw, 288px" />
              </div>
              <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{s.readingMinutes} min</p>
                <h2 className="text-[var(--text-strong)] mt-2 text-xl font-semibold leading-snug sm:text-2xl">{s.title}</h2>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">{s.deck}</p>
                <p className="text-[var(--brand-trust-blue)] mt-4 text-sm font-semibold">{t("read")}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
