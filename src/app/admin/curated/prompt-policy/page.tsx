import { AdminPromptPolicyClient } from "@/components/admin/admin-prompt-policy-client";

export default function AdminPromptPolicyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI prompt & policy</h1>
        <p className="text-muted-foreground mt-1 text-sm">Draft policy text for route synthesis — stored in session for this MVP.</p>
      </div>
      <AdminPromptPolicyClient />
    </div>
  );
}
