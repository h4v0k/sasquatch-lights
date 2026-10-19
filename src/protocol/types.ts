// A driver turns intents into bytes. It never touches Bluetooth itself:
// the BLE layer finds the write characteristic named in `write` and sends the bytes.

export type Bytes = number[];

export interface LightDriver {
  /** Stable id stored per device, e.g. "elk-generic". */
  id: string;
  /** Shown in the device settings picker. */
  label: string;
  /** Write characteristics to try, 16-bit hex, in order of preference. */
  write: string[];
  /** Services to request on connect (Web Bluetooth needs them up front; also used to filter scans). */
  services: string[];
  /** Packets to send right after connecting, with a delay between each. */
  init?: { bytes: Bytes; delayMs: number }[];
  on(): Bytes;
  off(): Bytes;
  /** r, g, b are 0–255. */
  color(r: number, g: number, b: number): Bytes;
  /** brightness is 0–100. Null when the device has no brightness command (scale RGB instead). */
  brightness: ((pct: number) => Bytes) | null;
  /** Minimum gap between writes to one device. */
  writeGapMs: number;
}

export const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Expands a 16-bit UUID to the full Bluetooth base UUID. */
export const fullUuid = (short: string) => `0000${short.toLowerCase()}-0000-1000-8000-00805f9b34fb`;
