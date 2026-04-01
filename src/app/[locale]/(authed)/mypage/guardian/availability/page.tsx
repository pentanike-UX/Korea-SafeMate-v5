import { getTranslations } from "next-intl/server";
import { GuardianAvailabilityClient } from "@/components/mypage/guardian-availability-client";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.guardianAvailability");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

export default async function GuardianAvailabilityPage() {
  const t = await getTranslations("V4.guardianAvailability");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-[var(--text-strong)] text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("lead")}</p>
      </div>
      <GuardianAvailabilityClient />
    </div>
  );
}
