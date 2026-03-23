import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function ExploreHero({ eyebrow = "Explore", title, description, children }: Props) {
  return (
    <section className="from-muted/50 via-background to-background relative overflow-hidden border-b bg-gradient-to-b">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(37,99,235,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
        <h1 className="text-foreground mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          {description}
        </p>
        <p className="text-muted-foreground mt-3 max-w-xl text-xs leading-relaxed">
          {/* TODO(prod): i18n — serve KO/EN/JP copy via next-intl or CMS; respect `Accept-Language`. */}
          한국어와 English 사용자 모두를 위해 작성된 실용 정보를 모읍니다. 기계 번역이 아닌 Guardian 검수를
          지향합니다.
        </p>
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
