import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getV4GuardianBySlug } from "@/data/v4/guardians";
import { BRAND } from "@/lib/constants";
import { GuardianRequestV4Form } from "@/components/v4/guardian-request-v4-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const g = getV4GuardianBySlug(slug);
  const t = await getTranslations("V4.guardianRequest");
  if (!g) return { title: t("notFound") };
  return { title: `${t("metaTitle")} · ${g.displayName} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function GuardianRequestPage({ params }: Props) {
  const { slug } = await params;
  const g = getV4GuardianBySlug(slug);
  const t = await getTranslations("V4.guardianRequest");
  if (!g) notFound();

  return (
    <div className="bg-[var(--bg-page)] page-container max-w-xl py-10 pb-28 sm:py-14">
      <h1 className="text-[var(--text-strong)] text-2xl font-semibold sm:text-3xl">{t("title", { name: g.displayName })}</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("lead")}</p>
      <div className="mt-8">
        <GuardianRequestV4Form guardianName={g.displayName} guardianSlug={g.slug} />
      </div>
    </div>
  );
}
