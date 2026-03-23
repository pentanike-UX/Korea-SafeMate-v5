import { BOOKING_STEP_LABELS } from "@/lib/booking-wizard-config";
import { cn } from "@/lib/utils";

type Props = {
  /** 0-based current step */
  currentStep: number;
};

export function BookingProgress({ currentStep }: Props) {
  return (
    <div className="w-full">
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-medium">
        <span>Step {currentStep + 1} of {BOOKING_STEP_LABELS.length}</span>
        <span className="text-primary">{Math.round(((currentStep + 1) / BOOKING_STEP_LABELS.length) * 100)}%</span>
      </div>
      <div
        className="bg-muted mb-4 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={BOOKING_STEP_LABELS.length}
        aria-label="Booking progress"
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${((currentStep + 1) / BOOKING_STEP_LABELS.length) * 100}%`,
          }}
        />
      </div>
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        {BOOKING_STEP_LABELS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                done && "text-muted-foreground",
                active && "text-foreground",
                !done && !active && "text-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                  done && "bg-primary/15 text-primary",
                  active && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
