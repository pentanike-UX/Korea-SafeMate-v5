import type { AIPlannerInput } from "@/domain/curated-experience";

/** Server-safe decode (Next.js RSC / route handlers). */
export function decodePlannerPayload(raw: string | undefined): AIPlannerInput | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as AIPlannerInput;
  } catch {
    try {
      const json = Buffer.from(raw, "base64").toString("utf8");
      return JSON.parse(json) as AIPlannerInput;
    } catch {
      return null;
    }
  }
}
