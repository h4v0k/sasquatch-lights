import { meetsRoadLock, rulesFor, type ColorId, type RegionRules, type ZoneId } from '../rules';
import { rgbOf, type Rgb } from './colors';

export const ZONES: ZoneId[] = ['head', 'tail', 'under', 'grille', 'engine'];

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

/** Pulls a mode back inside the road-lock rules (used for Road mode edits and as a final safety net while driving). */
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
    for (const k of ZONES) {
      if (k === zone) continue;
      zones[k] = { ...zones[k], color: patch.color, custom: patch.custom ?? zones[zone].custom };
    }
  }
  return { ...m, zones };
}

export { rulesFor };

/** Front-facing zones: red or blue there reads as police lights (FS 316.2397), so it is always blocked. */
export const FRONT_ZONES: ZoneId[] = ['head', 'grille', 'under'];

export function isPoliceColor([r, g, b]: Rgb): boolean {
  const red = r >= 170 && g <= 90 && b <= 110;
  const blue = b >= 170 && r <= 110 && g <= 140;
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
