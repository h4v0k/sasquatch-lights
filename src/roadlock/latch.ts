// Decides "driving" from GPS speed. Pure so it can be unit tested.
//
// - Over 5 mph turns driving on immediately.
// - It turns off only after the car has stayed under 1 mph for STOP_HOLD_MS (90 s, so most red lights keep the lock on).
//   The app can't read the gear selector, so this timer stands in for "in Park".
// - A fix with no speed, or no fix for a while, keeps the last state; with no fix at all yet we assume
//   moving when the caller says GPS is unavailable (fail safe).

export const DRIVE_ON_MS = 5 * 0.44704; // 5 mph in m/s
export const STOP_MS = 1 * 0.44704; // 1 mph
export const STOP_HOLD_MS = 90_000;

export type LatchState = { driving: boolean; stoppedSince: number | null };

export const initialLatch: LatchState = { driving: false, stoppedSince: null };

/** speed in m/s (null when the fix has no speed), now in ms. */
export function stepLatch(s: LatchState, speed: number | null, now: number): LatchState {
  if (speed == null || !Number.isFinite(speed) || speed < 0) return s;
  if (speed > DRIVE_ON_MS) return { driving: true, stoppedSince: null };
  if (!s.driving) return s;
  if (speed < STOP_MS) {
    const since = s.stoppedSince ?? now;
    if (now - since >= STOP_HOLD_MS) return { driving: false, stoppedSince: null };
    return { driving: true, stoppedSince: since };
  }
  // creeping between 1 and 5 mph: still driving, reset the stop timer
  return { driving: true, stoppedSince: null };
}

/** US state name (as reverse geocoding returns it) to the code used by the rule sets. */
const STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

export function stateCode(region: string | null | undefined, country: string | null | undefined): string | null {
  if (!region || (country && country.toUpperCase() !== 'US')) return null;
  const r = region.trim();
  if (/^[A-Z]{2}$/.test(r)) return r;
  return STATES[r.toLowerCase()] ?? null;
}

export type Fix = { lat: number; lon: number; t: number; speed: number | null; accuracy: number | null };

/** Meters between two coordinates (haversine). */
export function meters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MAX_GAP_MS = 10_000;
const MAX_ACCURACY_M = 50;

/**
 * Speed to trust for a fix, or null when it can't be trusted (keeps the lock on).
 * Android reports 0 when it has no speed, so a low reported speed only counts when movement since
 * the previous fix agrees. Uses the higher of reported and derived speed.
 */
export function trustedSpeed(prev: Fix | null, cur: Fix): number | null {
  const reported = cur.speed != null && Number.isFinite(cur.speed) && cur.speed >= 0 ? cur.speed : null;
  let derived: number | null = null;
  const goodAcc = (f: Fix) => f.accuracy == null || f.accuracy <= MAX_ACCURACY_M;
  if (prev && cur.t > prev.t && cur.t - prev.t >= 1000 && cur.t - prev.t <= MAX_GAP_MS && goodAcc(prev) && goodAcc(cur)) {
    derived = meters(prev, cur) / ((cur.t - prev.t) / 1000);
  }
  if (reported != null && reported > DRIVE_ON_MS) return Math.max(reported, derived ?? 0); // clearly moving
  if (derived == null) return null; // low or missing reported speed with nothing to check it against
  return Math.max(reported ?? 0, derived);
}
