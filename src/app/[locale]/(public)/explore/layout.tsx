import { ExploreLocalNav } from "@/components/v4/explore-local-nav";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-page)]">
      <div className="page-container py-8 sm:py-10 md:py-12">
        <ExploreLocalNav />
        {children}
      </div>
    </div>
  );
}
