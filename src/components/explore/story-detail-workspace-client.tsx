"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WorkspaceBinder, type WorkspaceRegistration } from "@/components/app-shell/workspace-registry";
import { FullBleedAmbientMap } from "@/components/map-shell/full-bleed-ambient-map";
import { Button } from "@/components/ui/button";

export type StoryDetailWorkspacePayload = {
  title: string;
  deck: string;
  readingMinutes: number;
  tags: string[];
  decisionFocus: string;
  bodyParagraphs: string[];
  relatedRouteSlugs: string[];
  coverImage: string;
};

export function StoryDetailWorkspaceClient({ story }: { story: StoryDetailWorkspacePayload }) {
  const t = useTranslations("V4.storyDetail");

  const panelBody = (
    <div className="space-y-6">
      {story.coverImage ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
          <Image src={story.coverImage} alt="" fill className="object-cover" sizes="(max-width:420px) 100vw, 380px" />
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {story.readingMinutes} min · {story.tags.join(" · ")}
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">{story.deck}</p>
      <section>
        <h2 className="text-[var(--text-strong)] text-xs font-semibold tracking-wide uppercase">{t("decisionFocus")}</h2>
        <p className="text-foreground mt-2 text-sm leading-relaxed">{story.decisionFocus}</p>
      </section>
      <div className="space-y-4">
        {story.bodyParagraphs.map((para, i) => (
          <p key={i} className="text-foreground text-sm leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </div>
  );

  const registration: WorkspaceRegistration = {
    contextKey: "story",
    panelTitle: story.title,
    panelSubtitle: story.deck,
    panelBody,
    stickyAction: (
      <div className="flex flex-wrap gap-2">
        {story.relatedRouteSlugs.map((rs) => (
          <Button key={rs} asChild variant="outline" className="min-w-[8rem] flex-1 rounded-[var(--radius-lg)]">
            <Link href={`/explore/routes/${rs}`}>{t("relatedRoute")}</Link>
          </Button>
        ))}
        <Button asChild className="min-w-[8rem] flex-1 rounded-[var(--radius-lg)]">
          <Link href="/planner">{t("openPlanner")}</Link>
        </Button>
      </div>
    ),
    map: <FullBleedAmbientMap region="seoul_core" className="h-full w-full" />,
    initialSheetSnap: "half",
  };

  return <WorkspaceBinder registration={registration} />;
}
