// Whether the Road lock is in force. Pure, so tests can import it without the app store.

/** Location is only used to know which state you're in. */
export type LocationStatus = 'starting' | 'ok' | 'denied' | 'unavailable';

/**
 * Road lock setting. `auto`: on while the car is moving (over 15 mph, until parked for 2 minutes);
 * `on`: always; `parade`: off even while moving. Parade never survives a relaunch (it comes back as auto).
 */
export type LockMode = 'auto' | 'on' | 'parade';

/** What the speed watcher knows. `none`: no speed reading (no permission, GPS off, or no fix yet). */
export type Motion = { moving: boolean; mph: number | null; source: 'gps' | 'none' };

/**
 * Whether the Road lock is in force right now. Auto with location permission denied counts as on: with no
 * way to ever see speed, it stays legal. No GPS fix (indoors, GPS off) counts as parked.
 */
export function lockActive(s: { lockMode: LockMode; motion: Motion; location: LocationStatus }): boolean {
  if (s.lockMode === 'on') return true;
  if (s.lockMode === 'parade') return false;
  if (s.motion.source === 'none' && s.location === 'denied') return true;
  return s.motion.moving;
}

