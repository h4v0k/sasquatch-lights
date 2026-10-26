// Road lock rules as data. Not legal advice; see docs/ROAD-LOCK.md for sources and confidence.

export type ZoneId = 'head' | 'tail' | 'under' | 'grille' | 'engine';
export type ColorId =
  | 'white' | 'amber' | 'red' | 'olive' | 'bronze' | 'green' | 'cyan' | 'ice' | 'blue' | 'purple' | 'pink' | 'custom';

/**
 * What a zone may show while the Road lock is on.
 * - `white` / `red`: that color only (headlights / taillights).
 * - `noPolice`: any steady color except red or blue (by hue); red or blue snaps to the nearest allowed hue.
 */
export type Palette = 'white' | 'red' | 'noPolice';

export type ZoneRule = {
  allowed: boolean;
  palette: Palette;
  maxBrightness: number;
  /** Must be lit while the Road lock is on (head and tail lights). */
  mustBeOn?: boolean;
  note: string;
  confidence: 'statute' | 'unsettled' | 'conservative';
};

export type RegionRules = { region: string; cite: string; zones: Record<ZoneId, ZoneRule> };

/**
 * Applies with the lock on in any state, including when the state is unknown: white headlamps and red
 * tail lamps are required everywhere in the US (FMVSS 108), and no red or blue on the accents keeps clear
 * of police-light laws. The lock never fails open.
 */
const accent = (note: string): ZoneRule => ({
  allowed: true, palette: 'noPolice', maxBrightness: 100, note, confidence: 'unsettled',
});

export const BASELINE: RegionRules = {
  region: 'Default',
  cite: 'FMVSS 108 (white headlamps, red tail lamps); no red or blue accents',
  zones: {
    head: { allowed: true, mustBeOn: true, palette: 'white', maxBrightness: 100, note: 'On, white only, steady', confidence: 'statute' },
    tail: { allowed: true, mustBeOn: true, palette: 'red', maxBrightness: 100, note: 'On, red only, steady', confidence: 'statute' },
    under: accent('Any steady color except red or blue'),
    grille: accent('Any steady color except red or blue'),
    engine: accent('Any steady color except red or blue'),
  },
};

export const RULES: Record<string, RegionRules> = {
  FL: { ...BASELINE, region: 'Florida', cite: 'FS 316.220, 316.221, 316.234, 316.2397' },
};

/** Rules for a state; the baseline when there is no rule set for it (or no location). */
export const rulesFor = (regionCode?: string | null): RegionRules => (regionCode && RULES[regionCode]) || BASELINE;

/** Whether a state has its own rule set (vs. the baseline). */
export const hasRuleSet = (regionCode?: string | null): boolean => !!(regionCode && RULES[regionCode]);
