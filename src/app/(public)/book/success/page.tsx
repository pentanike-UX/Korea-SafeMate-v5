import { Suspense } from "react";
import { BookingSuccessClient } from "./booking-success-client";

export const metadata = {
  title: "Request submitted | Korea SafeMate",
};

export default function BookSuccessPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground mx-auto max-w-2xl p-8 text-sm">Loading…</p>}>
      <BookingSuccessClient />
    </Suspense>
  );
}
