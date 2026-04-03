// Full-screen chat — 문서(body) 스크롤 없이 뷰포트에 고정, 스크롤은 셸 내부 패널만
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
