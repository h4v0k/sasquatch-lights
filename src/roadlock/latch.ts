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
