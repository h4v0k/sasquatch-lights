import type { Bytes } from '../protocol';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bytes to base64 (react-native-ble-plx writes base64; React Native has no Buffer). */
export function toBase64(bytes: Bytes): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] & 0xff;
    const b = i + 1 < bytes.length ? bytes[i + 1] & 0xff : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] & 0xff : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

/** "0000fff3-0000-1000-8000-00805f9b34fb" -> "fff3"; 16-bit inputs pass through lowercased. */
export function shortUuid(uuid: string): string {
  const u = uuid.toLowerCase();
  return u.length >= 8 && u.includes('-') ? u.slice(4, 8) : u;
}

export const hex = (b: Bytes) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');

/** Reconnect delay: 1s, 2s, 4s, 8s, then every 15s. */
export const backoffMs = (attempt: number) => Math.min(15000, 1000 * 2 ** Math.max(0, attempt));

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
