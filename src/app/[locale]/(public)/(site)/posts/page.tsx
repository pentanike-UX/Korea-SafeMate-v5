import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Legacy path: editorial content now lives under Stories. */
export default async function PostsPage() {
  const locale = await getLocale();
  redirect({ href: "/stories", locale });
}
