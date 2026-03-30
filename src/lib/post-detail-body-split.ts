/**
 * Split post body into a leading "intro" paragraph and the remainder.
 * Uses first `\n\n`-delimited block when present; otherwise whole string is lead if non-empty.
 */
export function splitPostBodyLeadRest(body: string): { lead: string; rest: string } {
  const trimmed = body.trim();
  if (!trimmed) return { lead: "", rest: "" };
  const idx = trimmed.indexOf("\n\n");
  if (idx === -1) return { lead: trimmed, rest: "" };
  const lead = trimmed.slice(0, idx).trim();
  const rest = trimmed.slice(idx + 2).trim();
  return { lead, rest };
}
