import { rulesFor, type ColorId, type RegionRules, type ZoneId } from '../rules';
import { hsvToRgb, rgbOf, type Rgb } from './colors';

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

/** True when the Road lock would leave this mode exactly as it is (nothing snaps). */
export function modeMeetsRoadLock(m: Mode, rules: RegionRules | null): boolean {
  if (!rules) return true;
  const c = clampToRules(m, rules);
  return ZONES.every((k) => {
    const a = m.zones[k], b = c.zones[k];
    if (!a.on && !b.on) return true;
    const ra = rgbOf(a.color, a.custom), rb = rgbOf(b.color, b.custom);
    return a.on === b.on && a.brightness === b.brightness && ra.every((v, i) => v === rb[i]);
  });
}

/**
 * Snaps the lights to the Road lock rules: headlights white and on, taillights red and on, accents kept
 * as they are unless red or blue, which move to the nearest allowed hue (red to orange or pink, blue to
 * cyan or purple) at the same saturation and brightness. Nothing is switched to a different mode.
 */
export function clampToRules(m: Mode, rules: RegionRules | null): Mode {
  if (!rules) return m;
  const zones = { ...m.zones };
  for (const k of ZONES) {
    const r = rules.zones[k];
    const cur = zones[k];
    if (!r.allowed) { zones[k] = { ...cur, on: false }; continue; }
    const next: Zone = { ...cur, on: r.mustBeOn ? true : cur.on, brightness: Math.min(cur.brightness, r.maxBrightness) };
    if (r.palette === 'white') next.color = 'white';
    else if (r.palette === 'red') next.color = 'red';
    else {
      const rgb = rgbOf(cur.color, cur.custom);
      if (isPoliceColor(rgb)) { next.color = 'custom'; next.custom = snapOffPolice(rgb); }
    }
    zones[k] = next;
  }
  return { ...m, zones };
}

/**
 * The mode the lights should actually show. With the Road lock on, the active mode is snapped to the
 * rules (never replaced). Red and blue are always kept off the front, lock on or off.
 */
export function effectiveMode(modes: Mode[], activeId: string, roadLock: boolean, rules: RegionRules | null): Mode {
  const road = modes.find((m) => m.id === ROAD_ID) ?? SEED_MODES[0];
  const active = modes.find((m) => m.id === activeId) ?? road;
  if (!roadLock) return applyFrontFloor(active);
  return applyFrontFloor(clampToRules(active, rules ?? rulesFor(null)));
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

/** One color on every light (the Garage "Match all lights" wheel). Red or blue never goes to the front zones. */
export function matchAll(m: Mode, color: ColorId, custom: Rgb): Mode {
  const zones = { ...m.zones };
  const police = isPoliceColor(rgbOf(color, custom));
  for (const k of ZONES) {
    if (FRONT_ZONES.includes(k) && police) { zones[k] = { ...zones[k], on: true }; continue; }
    zones[k] = { ...zones[k], on: true, color, custom };
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

/** Moves a red or blue color to the nearest allowed hue, keeping saturation and brightness. */
export function snapOffPolice(rgb: Rgb): Rgb {
  if (!isPoliceColor(rgb)) return rgb;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  let to: number;
  if (h >= 190 && h <= 260) to = h < 225 ? 184 : 266; // blue: to cyan or purple
  else to = h <= 20 ? 26 : 334; // red: to orange or pink
  return hsvToRgb(to, s, max / 255);
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
