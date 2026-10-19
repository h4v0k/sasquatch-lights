import type { LatchState } from './latch';

/** 'ok' = a recent fix. Anything else keeps the road lock on (fail safe). */
export type GpsStatus = 'starting' | 'ok' | 'stale' | 'denied' | 'unavailable';

/** A fix older than this counts as no GPS. */
export const FIX_STALE_MS = 15_000;

/** Fail safe: until there is a recent GPS fix (no permission, no signal, still starting) the lock stays on. */
export function isDriving(s: { latch: LatchState; gps: GpsStatus; simulateDriving: boolean }): boolean {
  return s.simulateDriving || s.latch.driving || s.gps !== 'ok';
}
