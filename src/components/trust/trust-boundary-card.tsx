import { SERVICE_SCOPE } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

export function TrustBoundaryCard() {
  return (
    <Card className="border-primary/15 bg-card/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Service scope & boundaries
        </CardTitle>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Korea SafeMate provides practical companion support. We are not a licensed tour operator,
          medical provider, legal advisor, or emergency service. We do not guarantee outcomes or
          &quot;full responsibility&quot; for your safety.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Typically includes
          </p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {SERVICE_SCOPE.included.map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Not included
          </p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            {SERVICE_SCOPE.excluded.map((line) => (
              <li key={line} className="flex gap-2">
                <X className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
