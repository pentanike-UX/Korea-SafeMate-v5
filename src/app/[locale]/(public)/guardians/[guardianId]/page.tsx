import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { mockGuardians } from "@/data/mock";
import { GuardianDetailView } from "@/components/guardians/guardian-detail-view";
import { getPublicGuardianById } from "@/lib/guardian-public";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ locale: string; guardianId: string }> };

export function generateStaticParams() {
  return mockGuardians.map((g) => ({ guardianId: g.user_id }));
}

export async function generateMetadata({ params }: Props) {
  const { guardianId } = await params;
  const g = getPublicGuardianById(guardianId);
  const t = await getTranslations("GuardianDetail");
  if (!g) {
    return { title: `${t("notFound")} | ${BRAND.name}` };
  }
  return {
    title: `${g.display_name} | ${BRAND.name}`,
    description: g.headline,
  };
}

export default async function GuardianDetailPage({ params }: Props) {
  const { guardianId } = await params;
  const g = getPublicGuardianById(guardianId);
  if (!g) notFound();
  return <GuardianDetailView guardian={g} />;
}
