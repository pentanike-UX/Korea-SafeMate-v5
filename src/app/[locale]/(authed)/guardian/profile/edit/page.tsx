import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuardianProfileImagesForm } from "@/components/guardian/guardian-profile-images-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";

export async function generateMetadata() {
  const t = await getTranslations("GuardianProfileEdit");
  return {
    title: `${t("metaTitle")} | ${BRAND.name}`,
    description: t("metaDescription"),
  };
}

export default async function GuardianProfileEditPage() {
  const t = await getTranslations("GuardianProfileEdit");
  const sb = await getServerSupabaseForUser();

  if (!sb) {
    return (
      <div className="page-container max-w-2xl py-8 sm:py-10">
        <p className="text-muted-foreground text-sm">{t("authUnavailable")}</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return (
      <div className="page-container max-w-2xl py-8 sm:py-10">
        <p className="text-muted-foreground text-sm">{t("authUnavailable")}</p>
      </div>
    );
  }

  const { data: row, error } = await sb
    .from("guardian_profiles")
    .select("photo_url, avatar_image_url, list_card_image_url, detail_hero_image_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="page-container max-w-2xl py-8 sm:py-10">
        <p className="text-destructive text-sm">
          {error.message.includes("column") ? `${error.message} (DB 마이그레이션을 적용했는지 확인해 주세요.)` : error.message}
        </p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="page-container max-w-2xl space-y-6 py-8 sm:py-10">
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
          <CardHeader>
            <CardTitle className="text-xl">{t("pageTitle")}</CardTitle>
            <CardDescription>{t("noRow")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild className="rounded-xl font-semibold">
              <Link href="/guardian/onboarding">{t("openOnboarding")}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/guardian/profile">{t("backToProfile")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl space-y-8 py-8 sm:py-10">
      <div>
        <h1 className="text-text-strong text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed">{t("pageLead")}</p>
        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{t("marketingCopyLead")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/guardian/onboarding">{t("openOnboarding")}</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/guardian/profile">{t("backToProfile")}</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-sm)]">
        <CardContent className="p-6 sm:p-8">
          <GuardianProfileImagesForm
            userId={user.id}
            initial={{
              photo_url: row.photo_url,
              avatar_image_url: row.avatar_image_url as string | null,
              list_card_image_url: row.list_card_image_url as string | null,
              detail_hero_image_url: row.detail_hero_image_url as string | null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
