import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("Login");
  return {
    title: `${t("metaTitle")} | ${BRAND.name}`,
  };
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("Login");
  const { error } = await searchParams;
  const errorMessage =
    error === "oauth"
      ? t("oauthFailed")
      : error === "config"
        ? t("googleConfigMissing")
        : null;

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {errorMessage ? (
            <p className="bg-destructive/10 text-destructive rounded-[var(--radius-md)] px-3 py-2 text-sm">{errorMessage}</p>
          ) : null}
          <GoogleSignInButton variant="traveler" />
          <Button disabled className="rounded-xl">
            {t("continueEmail")}
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/explore">{t("browseExplore")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/book">{t("continueBooking")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/login/guardian">{t("guardianLoginLink")}</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <NextLink href="/guardian/dashboard">{t("previewGuardian")}</NextLink>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <NextLink href="/admin">{t("previewAdmin")}</NextLink>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
