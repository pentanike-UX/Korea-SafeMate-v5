"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function RailItem({
  href,
  label,
  active,
  children,
  onClick,
  title,
}: {
  href?: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const className = cn(
    "flex size-12 items-center justify-center rounded-[14px] transition-[background-color,box-shadow,color] duration-200",
    active
      ? "bg-[var(--brand-trust-blue-soft)] text-[var(--brand-trust-blue)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-trust-blue)_35%,transparent)]"
      : "text-[var(--text-strong)]/70 hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-strong)]",
  );

  const inner = (
    <>
      <span className="sr-only">{label}</span>
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={active ? "page" : undefined} title={title ?? label}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label} title={title ?? label}>
      {inner}
    </button>
  );
}
