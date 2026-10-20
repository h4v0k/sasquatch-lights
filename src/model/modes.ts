import { meetsRoadLock, rulesFor, type ColorId, type RegionRules, type ZoneId } from '../rules';
import { rgbOf, type Rgb } from './colors';

export const ZONES: ZoneId[] = ['head', 'tail', 'under', 'grille', 'engine'];

/** Front-facing zones: red or blue there reads as police lights (FS 316.2397), so it is always blocked. */
export const FRONT_ZONES: ZoneId[] = ['head', 'grille', 'under'];

export const ZONE_LABEL: Record<ZoneId, string> = {
  head: 'Headlights',
  tail: 'Taillights',
  under: 'Underglow',
  grille: 'Grille',
  engine: 'Engine bay',
};

/** Which car view best shows each zone. */
export const ZONE_VIEW: Record<ZoneId, 'side' | 'front' | 'rear'> = {
  head: 'front',
  tail: 'rear',
  under: 'side',
  grille: 'front',
  engine: 'front',
};

/** v1 is solid colors only (no effects). */
export type Zone = { on: boolean; color: ColorId; custom: Rgb; brightness: number };
export type Mode = { id: string; name: string; builtin?: boolean; zones: Record<ZoneId, Zone> };

const z = (on: boolean, color: ColorId, brightness = 100): Zone => ({ on, color, custom: [255, 122, 0], brightness });

export const ROAD_ID = 'road';

export const SEED_MODES: Mode[] = [
  { id: 'road', name: 'Road', builtin: true, zones: { head: z(true, 'white'), tail: z(true, 'red'), under: z(false, 'olive', 60), grille: z(false, 'white'), engine: z(false, 'white') } },
  { id: 'show', name: 'Show', builtin: true, zones: { head: z(true, 'olive'), tail: z(true, 'olive'), under: z(true, 'olive'), grille: z(true, 'olive', 90), engine: z(true, 'bronze') } },
  { id: 'glow', name: 'Night Glow', builtin: true, zones: { head: z(true, 'white', 30), tail: z(true, 'red', 35), under: z(true, 'olive', 45), grille: z(false, 'olive'), engine: z(false, 'bronze') } },
  { id: 'cruise', name: 'Cruise', zones: { head: z(true, 'white'), tail: z(true, 'red'), under: z(true, 'olive', 60), grille: z(false, 'white'), engine: z(false, 'olive') } },
  { id: 'bronze', name: 'Bronze Age', zones: { head: z(true, 'bronze'), tail: z(true, 'bronze'), under: z(true, 'bronze'), grille: z(true, 'bronze'), engine: z(true, 'bronze') } },
];

export const blankMode = (): Mode => ({
  id: 'draft',
  name: '',
  zones: { head: z(true, 'white'), tail: z(true, 'red'), under: z(true, 'olive'), grille: z(true, 'olive'), engine: z(true, 'olive') },
});

export function modeMeetsRoadLock(m: Mode, rules: RegionRules | null): boolean {
  if (!rules) return true;
  const zones = {} as Parameters<typeof meetsRoadLock>[0];
  for (const k of ZONES) zones[k] = { ...m.zones[k], effect: 'solid' };
  return meetsRoadLock(zones, rules);
}

/** Pulls a mode back inside the Road lock rules (edits while the lock is on, and a final safety net for what's shown). */
export function clampToRules(m: Mode, rules: RegionRules | null): Mode {
  if (!rules) return m;
  const zones = { ...m.zones };
  for (const k of ZONES) {
    const r = rules.zones[k];
    const cur = zones[k];
    if (!r.allowed) zones[k] = { ...cur, on: false };
    else {
      const color = r.colors.includes(cur.color) ? cur.color : r.colors[0];
      zones[k] = { ...cur, on: r.mustBeOn ? true : cur.on, color, brightness: Math.min(cur.brightness, r.maxBrightness) };
    }
  }
  return { ...m, zones };
}

/**
 * The mode the lights should actually show. With the Road lock on and a rule set for the state, a mode
 * outside the rules is replaced by Road, and whatever runs is clamped to the rules. Red and blue are
 * always kept off the front, lock on or off.
 */
export function effectiveMode(modes: Mode[], activeId: string, roadLock: boolean, rules: RegionRules | null): Mode {
  const road = modes.find((m) => m.id === ROAD_ID) ?? SEED_MODES[0];
  const active = modes.find((m) => m.id === activeId) ?? road;
  if (!roadLock || !rules) return applyFrontFloor(active);
  const pick = modeMeetsRoadLock(active, rules) ? active : road;
  return applyFrontFloor(clampToRules(pick, rules));
}

/** Applies a zone edit; with color sync on, a color change goes to every zone. */
export function editZone(m: Mode, zone: ZoneId, patch: Partial<Zone>, sync: boolean): Mode {
  const zones = { ...m.zones, [zone]: { ...m.zones[zone], ...patch } };
  if (sync && patch.color !== undefined) {
    const rgb = rgbOf(patch.color, patch.custom ?? zones[zone].custom);
    for (const k of ZONES) {
      if (k === zone) continue;
      if (FRONT_ZONES.includes(k) && isPoliceColor(rgb)) continue; // red/blue never synced to the front
      zones[k] = { ...zones[k], color: patch.color, custom: patch.custom ?? zones[zone].custom };
    }
  }
  return { ...m, zones };
}

export { rulesFor };


/**
 * Red or blue by hue for any visible color: red is 340–20° (saturation ≥ 0.35), blue is 190–260°
 * (saturation ≥ 0.15, so pale ice blues count too). Cyan, purple, pink, amber, bronze and white stay allowed.
 */
export function isPoliceColor([r, g, b]: Rgb): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  if (v < 0.2 || s < 0.15) return false;
  let h: number;
  if (max === r) h = 60 * (((g - b) / (max - min)) % 6);
  else if (max === g) h = 60 * ((b - r) / (max - min) + 2);
  else h = 60 * ((r - g) / (max - min) + 4);
  if (h < 0) h += 360;
  const red = (h >= 340 || h <= 20) && s >= 0.35;
  const blue = h >= 190 && h <= 260;
  return red || blue;
}

/** Red or blue on a front zone falls back to white. Applied to everything the lights show. */
export function applyFrontFloor(m: Mode): Mode {
  const zones = { ...m.zones };
  for (const k of FRONT_ZONES) {
    const z = zones[k];
    if (isPoliceColor(rgbOf(z.color, z.custom))) zones[k] = { ...z, color: 'white' };
  }
  return { ...m, zones };
}
