// Pure scan-budget logic for the reconnect finder, kept separate so it can be tested.

/**
 * Android (7+) silently returns no results to an app that starts more than 5 scans in 30 seconds.
 * Stay under it with room for a user scan.
 */
export const SCAN_WINDOW_MS = 30_000;
export const MAX_SCANS_PER_WINDOW = 4;
/** How long the finder listens each time. */
export const FIND_SCAN_MS = 4_000;
/** Direct retries before a light waits for the finder to hear it. */
export const DIRECT_RETRIES = 2;
/** A light the finder can't hear still gets a direct try this often (some boxes advertise rarely). */
export const DIRECT_FALLBACK_MS = 45_000;

/** Drops scan starts older than the window and says whether another start is allowed now. */
export function scanBudget(starts: number[], now: number): { ok: boolean; recent: number[] } {
  const recent = starts.filter((t) => now - t < SCAN_WINDOW_MS);
  return { ok: recent.length < MAX_SCANS_PER_WINDOW, recent };
}
