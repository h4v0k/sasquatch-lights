// Road lock rules as data. Not legal advice; see docs/ROAD-LOCK.md for sources and confidence.

export type ZoneId = 'head' | 'tail' | 'under' | 'grille' | 'engine';
export type ColorId =
  | 'white' | 'amber' | 'red' | 'olive' | 'bronze' | 'green' | 'cyan' | 'ice' | 'blue' | 'purple' | 'pink' | 'custom';

export type ZoneRule = {
  allowed: boolean;
  colors: ColorId[];
  maxBrightness: number;
  /** Must be lit while the Road lock is on (head and tail lights). */
  mustBeOn?: boolean;
  note: string;
  confidence: 'statute' | 'unsettled' | 'conservative';
};

export type RegionRules = { region: string; cite: string; zones: Record<ZoneId, ZoneRule> };

const off = (note: string): ZoneRule => ({ allowed: false, colors: [], maxBrightness: 0, note, confidence: 'conservative' });

export const RULES: Record<string, RegionRules> = {
  FL: {
    region: 'Florida',
    cite: 'FS 316.220, 316.221, 316.234, 316.2397',
    zones: {
      head: { allowed: true, mustBeOn: true, colors: ['white'], maxBrightness: 100, note: 'On, white only, steady', confidence: 'statute' },
      tail: { allowed: true, mustBeOn: true, colors: ['red'], maxBrightness: 100, note: 'On, red only, steady', confidence: 'statute' },
      under: {
        allowed: true, colors: ['white', 'amber', 'olive', 'bronze', 'green'], maxBrightness: 60,
        note: 'Unsettled: white, amber, green, Sasquatch or bronze; steady; 60% max', confidence: 'unsettled',
      },
      grille: off('Off'),
      engine: off('Off (under the hood)'),
    },
  },
};

/** Rules for a state, or null when there is no rule set (or no location): fail open, so only the
 * always-on front red/blue block applies (see applyFrontFloor in model/modes.ts). */
export const rulesFor = (regionCode?: string | null): RegionRules | null => (regionCode && RULES[regionCode]) || null;

export type ZoneState = { on: boolean; color: ColorId; effect: 'solid' | 'breathe' | 'strobe'; brightness: number };

/** A mode may run with the Road lock on only if every lit zone obeys the state's rules and is steady. */
export function meetsRoadLock(zones: Record<ZoneId, ZoneState>, rules: RegionRules): boolean {
  return (Object.keys(zones) as ZoneId[]).every((k) => {
    const z = zones[k];
    const r = rules.zones[k];
    if (!z.on) return !r.mustBeOn;
    return r.allowed && r.colors.includes(z.color) && z.effect === 'solid' && z.brightness <= r.maxBrightness;
  });
}
