// Road lock rules as data. Not legal advice; see docs/ROAD-LOCK.md for sources and confidence.

export type ZoneId = 'head' | 'tail' | 'under' | 'grille' | 'engine';
export type ColorId =
  | 'white' | 'amber' | 'red' | 'olive' | 'bronze' | 'green' | 'cyan' | 'ice' | 'blue' | 'purple' | 'pink' | 'custom';

export type ZoneRule = {
  allowed: boolean;
  colors: ColorId[];
  maxBrightness: number;
  /** Must be lit while driving (head and tail lights). */
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

/** Used when the region is unknown or has no rule set: strictest. */
export const UNKNOWN: RegionRules = {
  region: 'Unknown',
  cite: 'None: strictest defaults',
  zones: {
    head: { allowed: true, mustBeOn: true, colors: ['white'], maxBrightness: 100, note: 'On, white only, steady', confidence: 'conservative' },
    tail: { allowed: true, mustBeOn: true, colors: ['red'], maxBrightness: 100, note: 'On, red only, steady', confidence: 'conservative' },
    under: off('Off'),
    grille: off('Off'),
    engine: off('Off (under the hood)'),
  },
};

export const rulesFor = (regionCode?: string | null) => (regionCode && RULES[regionCode]) || UNKNOWN;

export type ZoneState = { on: boolean; color: ColorId; effect: 'solid' | 'breathe' | 'strobe'; brightness: number };

/** A mode may run while driving only if every lit zone obeys the region's rules and is steady. */
export function meetsRoadLock(zones: Record<ZoneId, ZoneState>, rules: RegionRules): boolean {
  return (Object.keys(zones) as ZoneId[]).every((k) => {
    const z = zones[k];
    const r = rules.zones[k];
    if (!z.on) return !r.mustBeOn;
    return r.allowed && r.colors.includes(z.color) && z.effect === 'solid' && z.brightness <= r.maxBrightness;
  });
}
