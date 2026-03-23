import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata = {
  title: "Book | Korea SafeMate",
  description: "Request trusted local support — reviewed before matching.",
};

export default function BookPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          Support request
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight">
          Request trusted local support
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          This is a calm, structured intake — not a one-click tour checkout. Share accurate context so
          we can match you thoughtfully. External chat is only introduced after our team approves scope
          and a Guardian fit.
        </p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <BookingWizard />
      </Suspense>
    </div>
  );
}
