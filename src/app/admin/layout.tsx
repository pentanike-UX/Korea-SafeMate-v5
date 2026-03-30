import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { routing, type AppLocale } from "@/i18n/routing";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let showSuperAdmin = false;
  const sb = await getServerSupabaseForUser();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      const { data } = await sb.from("users").select("app_role").eq("id", user.id).maybeSingle();
      showSuperAdmin = data?.app_role === "super_admin";
    }
  }

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: AppLocale =
    rawLocale && routing.locales.includes(rawLocale as AppLocale) ? (rawLocale as AppLocale) : routing.defaultLocale;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="bg-muted/30 flex min-h-full flex-col md:flex-row">
        <AdminSidebar showSuperAdmin={showSuperAdmin} />
        <div className="border-border/40 min-h-[calc(100vh-3.5rem)] flex-1 md:min-h-screen md:border-l">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
