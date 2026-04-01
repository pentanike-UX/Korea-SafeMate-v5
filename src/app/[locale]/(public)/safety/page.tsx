import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.safety");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function SafetyPage() {
  const t = await getTranslations("V4.safety");

  return (
    <div className="bg-[var(--bg-page)] page-container max-w-3xl py-10 pb-24 sm:py-14">
      <h1 className="text-[var(--text-strong)] text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">{t("lead")}</p>
      <ul className="mt-10 space-y-4 text-sm leading-relaxed">
        <li className="bg-card ring-border/60 rounded-[var(--radius-lg)] p-5 ring-1">{t("bullet1")}</li>
        <li className="bg-card ring-border/60 rounded-[var(--radius-lg)] p-5 ring-1">{t("bullet2")}</li>
        <li className="bg-card ring-border/60 rounded-[var(--radius-lg)] p-5 ring-1">{t("bullet3")}</li>
      </ul>
      <p className="text-muted-foreground mt-10 text-sm">
        <Link href="/help" className="text-[var(--brand-trust-blue)] font-semibold hover:underline">
          {t("helpLink")}
        </Link>
      </p>
    </div>
  );
}
