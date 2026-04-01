import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.help");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function HelpPage() {
  const t = await getTranslations("V4.help");

  return (
    <div className="bg-[var(--bg-page)] page-container max-w-3xl py-10 pb-24 sm:py-14">
      <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t("lead")}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/planner"
          className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 ring-1 transition-shadow hover:shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[var(--text-strong)] font-semibold">{t("cardPlanner")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("cardPlannerDesc")}</p>
        </Link>
        <Link
          href="/explore/routes"
          className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 ring-1 transition-shadow hover:shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[var(--text-strong)] font-semibold">{t("cardExplore")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("cardExploreDesc")}</p>
        </Link>
        <Link
          href="/guardians"
          className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 ring-1 transition-shadow hover:shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[var(--text-strong)] font-semibold">{t("cardGuardians")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("cardGuardiansDesc")}</p>
        </Link>
        <Link
          href="/about"
          className="bg-card ring-border/60 rounded-[var(--radius-card)] p-6 ring-1 transition-shadow hover:shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[var(--text-strong)] font-semibold">{t("cardAbout")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("cardAboutDesc")}</p>
        </Link>
      </div>
    </div>
  );
}
