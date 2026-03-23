import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col md:flex-row">
      <AdminSidebar />
      <div className="border-border/40 min-h-[calc(100vh-3.5rem)] flex-1 md:min-h-screen md:border-l">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
