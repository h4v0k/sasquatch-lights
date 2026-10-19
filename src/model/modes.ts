import { meetsRoadLock, rulesFor, type ColorId, type RegionRules, type ZoneId } from '../rules';
import type { Rgb } from './colors';

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

export function modeMeetsRoadLock(m: Mode, rules: RegionRules): boolean {
  const zones = {} as Parameters<typeof meetsRoadLock>[0];
  for (const k of ZONES) zones[k] = { ...m.zones[k], effect: 'solid' };
  return meetsRoadLock(zones, rules);
}

/** Pulls a mode back inside the road-lock rules (used for Road mode edits and as a final safety net while driving). */
export function clampToRules(m: Mode, rules: RegionRules): Mode {
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
 * The mode the lights should actually show. While driving, a mode outside the rules is replaced
 * by Road, and whatever runs is clamped to the rules as a last line of defense.
 */
export function effectiveMode(modes: Mode[], activeId: string, driving: boolean, rules: RegionRules): Mode {
  const road = modes.find((m) => m.id === ROAD_ID) ?? SEED_MODES[0];
  const active = modes.find((m) => m.id === activeId) ?? road;
  if (!driving) return active;
  const pick = modeMeetsRoadLock(active, rules) ? active : road;
  return clampToRules(pick, rules);
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
