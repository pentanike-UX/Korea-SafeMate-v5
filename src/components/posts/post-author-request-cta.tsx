"use client";

import { useTranslations } from "next-intl";
import { GuardianRequestOpenTrigger } from "@/components/guardians/guardian-request-sheet";

export function PostAuthorRequestCta({ postId, postTitle }: { postId: string; postTitle: string }) {
  const t = useTranslations("GuardianRequest");
  return (
    <GuardianRequestOpenTrigger
      className="h-11 w-full rounded-xl font-semibold"
      postContext={{ postId, postTitle }}
    >
      {t("openCta")}
    </GuardianRequestOpenTrigger>
  );
}
