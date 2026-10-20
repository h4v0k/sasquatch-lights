import type { LatchState } from './latch';

/** 'ok' = a recent fix. Anything else keeps the road lock on (fail safe). */
export type GpsStatus = 'starting' | 'ok' | 'stale' | 'denied' | 'unavailable';

/** A fix older than this counts as no GPS. */
export const FIX_STALE_MS = 15_000;

/** Parade override: lifts the Road lock for a set time (no speed limit). Never persisted. */
export type Override = { until: number };

export const OVERRIDE_CHOICES_MIN = [30, 60, 120] as const;

type LockInput = { latch: LatchState; gps: GpsStatus; simulateDriving: boolean; override?: Override | null };

export function overrideActive(s: { override?: Override | null }, now: number = Date.now()): boolean {
  return !!s.override && now < s.override.until;
}

/** The Road lock is on unless the override is running. */
export function isDriving(s: LockInput, now: number = Date.now()): boolean {
  if (overrideActive(s, now)) return false;
  return lockRaw(s);
}

/** What the lock would say without the override: until there is a recent GPS fix it stays on (fail safe). */
export function lockRaw(s: LockInput): boolean {
  return s.simulateDriving || s.latch.driving || s.gps !== 'ok';
}
