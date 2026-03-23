import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Log in | Korea SafeMate",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Log in</CardTitle>
          <CardDescription>
            {/* TODO(prod): Implement Supabase Auth — email magic link, OAuth, or phone per market rules. */}
            Authentication is not wired in this MVP build. Use public pages and role dashboards for
            UI preview only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button disabled className="rounded-xl">
            Continue with email (soon)
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/explore">Browse Explore</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/book">Continue to booking flow</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/guardian/dashboard">Preview Guardian dashboard</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/admin">Preview Admin</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
