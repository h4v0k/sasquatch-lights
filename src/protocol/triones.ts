// HappyLighting / Triones. Sources: sysofwan/ha-triones, 8none1/pytrionesmqtt.
// Assumed for the Auto Addict Heritage X head and taillights. Unverified on havok's hardware.
import { clampByte } from './types';
import type { Bytes, LightDriver } from './types';

export const TRIONES: LightDriver = {
  id: 'triones',
  label: 'HappyLighting / Triones',
  write: ['ffd9', 'ffe9'],
  services: ['ffd5', 'ffe5', 'ffd0', 'ffe0'],
  on: () => [0xcc, 0x23, 0x33],
  off: () => [0xcc, 0x24, 0x33],
  color: (r, g, b) => [0x56, clampByte(r), clampByte(g), clampByte(b), 0x00, 0xf0, 0xaa],
  brightness: null, // no native command: scale RGB before calling color()
  writeGapMs: 150,
};

export const TRIONES_STATUS_QUERY: Bytes = [0xef, 0x01, 0x77];

export type TrionesStatus = { on: boolean; mode: number; speed: number; rgb: [number, number, number]; white: number };

/** Parses the 12-byte status notify: 66 04 PP MM 20 SS RR GG BB WW 03 99. Returns null if the frame doesn't match. */
export function parseTrionesStatus(b: Uint8Array | number[]): TrionesStatus | null {
  if (b.length < 12 || b[0] !== 0x66 || b[11] !== 0x99) return null;
  return { on: b[2] === 0x23, mode: b[3], speed: b[5], rgb: [b[6], b[7], b[8]], white: b[9] };
}
