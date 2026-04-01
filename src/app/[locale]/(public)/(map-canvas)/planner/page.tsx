import { getTranslations } from "next-intl/server";
import { PlannerV4Client } from "@/components/v4/planner-v4-client";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("V4.planner");
  return { title: `${t("metaTitle")} | ${BRAND.name}`, description: t("metaDescription") };
}

type Props = { searchParams: Promise<{ mood?: string }> };

export default async function PlannerPage({ searchParams }: Props) {
  const { mood } = await searchParams;

  return <PlannerV4Client key={mood ?? "none"} mood={mood ?? null} />;
}
