import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";

export async function generateMetadata() {
  const t = await getTranslations("LoginGuardian");
  return {
    title: `${t("title")} | ${BRAND.name}`,
  };
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GuardianLoginPage({ searchParams }: Props) {
  const t = await getTranslations("LoginGuardian");
  const tLogin = await getTranslations("Login");
  const { error } = await searchParams;
  const errorMessage =
    error === "oauth"
      ? tLogin("oauthFailed")
      : error === "config"
        ? tLogin("googleConfigMissing")
        : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-text-strong text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">{t("description")}</p>
      <div className="mt-8 flex flex-col gap-3">
        {errorMessage ? (
          <p className="bg-destructive/10 text-destructive rounded-[var(--radius-md)] px-3 py-2 text-sm">{errorMessage}</p>
        ) : null}
        <GoogleSignInButton variant="guardian" />
        <Button disabled className="rounded-xl" variant="secondary">
          {t("emailSoon")}
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/login">{t("travelerLogin")}</Link>
        </Button>
        <Button asChild className="rounded-xl">
          <NextLink href="/guardian/onboarding">{t("startOnboarding")}</NextLink>
        </Button>
        <Button asChild variant="ghost" className="rounded-xl">
          <NextLink href="/guardian/dashboard">{t("dashboardPreview")}</NextLink>
        </Button>
      </div>
    </div>
  );
}
