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
