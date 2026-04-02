import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata() {
  const t = await getTranslations("Home");
  return {
    title: `${t("metaTitle")} | ${BRAND.name}`,
    description: t("metaDescription"),
  };
}

/** 루트 진입 시 여행 동선 채팅(`/chat`)이 메인 경험 (지도 풀셸 없음) */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/chat", locale });
}
