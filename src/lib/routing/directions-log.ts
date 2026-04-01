type DirectionsLogPayload = Record<string, string | number | boolean | null | undefined>;

/** Structured logs for Directions pipeline (server). */
export function logDirections(event: string, payload: DirectionsLogPayload) {
  console.info(`[directions] ${event} ${JSON.stringify(payload)}`);
}
