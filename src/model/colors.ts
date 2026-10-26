import type { ColorId } from '../rules';

export type Rgb = [number, number, number];

export type Swatch = { id: Exclude<ColorId, 'custom'>; name: string; rgb: Rgb };

/** Preset colors. `rgb` is what goes to the lights; `hex` (derived) is for the screen. */
export const SWATCHES: Swatch[] = [
  { id: 'white', name: 'White', rgb: [255, 255, 255] },
  { id: 'amber', name: 'Amber', rgb: [255, 140, 0] },
  { id: 'red', name: 'Red', rgb: [255, 0, 0] },
  { id: 'olive', name: 'Sasquatch green', rgb: [140, 200, 40] },
  { id: 'bronze', name: 'Bronze', rgb: [224, 110, 30] },
  { id: 'green', name: 'Green', rgb: [0, 255, 60] },
  { id: 'cyan', name: 'Cyan', rgb: [0, 230, 210] },
  { id: 'ice', name: 'Ice blue', rgb: [90, 190, 255] },
  { id: 'blue', name: 'Blue', rgb: [0, 60, 255] },
  { id: 'purple', name: 'Purple', rgb: [150, 60, 255] },
  { id: 'pink', name: 'Pink', rgb: [255, 50, 170] },
];

/** Screen colors for the preview and swatches (LED white looks cool, so nudge it). */
const SCREEN: Partial<Record<ColorId, string>> = { white: '#F3F6FF' };

export const toHex = ([r, g, b]: Rgb) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

export function rgbOf(color: ColorId, custom: Rgb): Rgb {
  if (color === 'custom') return custom;
  return SWATCHES.find((s) => s.id === color)?.rgb ?? [255, 255, 255];
}

export function screenHex(color: ColorId, custom: Rgb): string {
  return SCREEN[color] ?? toHex(rgbOf(color, custom));
}

export function colorName(color: ColorId): string {
  if (color === 'custom') return 'Custom';
  return SWATCHES.find((s) => s.id === color)?.name ?? 'White';
}

/** Hue (0–360) at full saturation and value, for the custom color strip. */
export function hueToRgb(h: number): Rgb {
  const x = (1 - Math.abs(((h / 60) % 2) - 1)) * 255;
  const c = 255;
  const seg = Math.floor(((h % 360) + 360) % 360 / 60);
  const t: Rgb[] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = t[seg];
  return [Math.round(r), Math.round(g), Math.round(b)];
}

/** HSV (h 0–360, s and v 0–1) to RGB. */
export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const hh = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  const t: [number, number, number][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = t[Math.min(5, Math.floor(hh))];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** RGB to hue (0–360) and saturation (0–1), for placing the color wheel's knob. */
export function rgbToHs([r, g, b]: Rgb): { h: number; s: number } {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (d === 0) return { h: 0, s };
  let h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return { h, s };
}

/**
 * Color wheel math, shared by the wheel image generator and the touch handler.
 * Hue runs clockwise from the right (screen coords, y down); saturation grows from the white center.
 */
export function wheelColor(dx: number, dy: number, radius: number): { rgb: Rgb; h: number; s: number } {
  const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  const s = Math.min(1, Math.hypot(dx, dy) / radius);
  return { rgb: hsvToRgb(h, s, 1), h, s };
}
