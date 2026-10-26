// Pure moving/parked logic for the Auto Road lock, kept separate from GPS so it can be tested.

export const ENGAGE_MPH = 15;
/** Under this counts as stopped. */
export const STOPPED_MPH = 3;
/** Stopped this long (or no GPS reading this long) before the lock lets go, so a red light doesn't unlock it. */
export const RELEASE_MS = 2 * 60_000;
/** Readings at or over ENGAGE_MPH needed in a row (filters a single GPS glitch while parked). */
export const ENGAGE_READINGS = 2;

export const MPS_TO_MPH = 2.236936;

export type MotionTracker = { moving: boolean; fastCount: number; stoppedSince: number | null; lastFix: number | null };

export const newTracker = (): MotionTracker => ({ moving: false, fastCount: 0, stoppedSince: null, lastFix: null });

/** Feeds one GPS speed reading (mph, null when the fix has no speed). */
export function onReading(t: MotionTracker, mph: number | null, now: number): MotionTracker {
  const next = { ...t, lastFix: now };
  if (mph === null) return next;
  next.fastCount = mph >= ENGAGE_MPH ? t.fastCount + 1 : 0;
  if (!t.moving) {
    if (next.fastCount >= ENGAGE_READINGS) return { ...next, moving: true, stoppedSince: null };
    return next;
  }
  if (mph < STOPPED_MPH) {
    const since = t.stoppedSince ?? now;
    if (now - since >= RELEASE_MS) return { ...next, moving: false, stoppedSince: null, fastCount: 0 };
    return { ...next, stoppedSince: since };
  }
  return { ...next, stoppedSince: null };
}

/** Called on a timer: with no GPS reading for RELEASE_MS (parked in a garage, GPS lost), the lock lets go. */
export function onTick(t: MotionTracker, now: number): MotionTracker {
  if (t.moving && t.lastFix !== null && now - t.lastFix >= RELEASE_MS) return { ...t, moving: false, stoppedSince: null, fastCount: 0 };
  return t;
}
