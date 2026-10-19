import { clampByte } from './types';
import type { LightDriver } from './types';
import { ELK_DRIVERS } from './elkbledom';
import { TRIONES } from './triones';

export * from './types';
export { TRIONES, parseTrionesStatus, TRIONES_STATUS_QUERY } from './triones';

export const DRIVERS: LightDriver[] = [...ELK_DRIVERS, TRIONES];
export const driverById = (id: string) => DRIVERS.find((d) => d.id === id);

/** Every service any driver needs, for the scan / connect request. */
export const ALL_SERVICES = Array.from(new Set(DRIVERS.flatMap((d) => d.services)));

/** Best first guess from the advertised name. The user can override per device. */
export function guessDriver(name: string | null | undefined): LightDriver {
  const n = (name ?? '').toLowerCase();
  const pick = (id: string) => driverById(id)!;
  if (n.startsWith('elk-bledob') || n.startsWith('elk-bledom0e')) return pick('elk-dob');
  if (n.startsWith('elk-bleddm')) return pick('elk-ddm');
  if (n.startsWith('elk-btc')) return pick('elk-btc');
  if (n.startsWith('elk')) return pick('elk-generic');
  if (n.startsWith('melk')) return pick('melk');
  if (n.startsWith('triones') || n.startsWith('qhm') || n.startsWith('dream') || n.startsWith('flash')) return TRIONES;
  if (n.startsWith('ledble')) return pick('ledble'); // collides with Triones; ELK first
  if (n.startsWith('led-') || n.startsWith('jackyled')) return pick('led-dash');
  return pick('elk-generic');
}

/**
 * The packets to bring a zone to a state. Brightness goes native when the driver has it,
 * otherwise RGB is scaled (Triones).
 */
export function packetsFor(d: LightDriver, s: { on: boolean; rgb: [number, number, number]; brightness: number }) {
  if (!s.on) return [d.off()];
  const [r, g, b] = s.rgb;
  if (d.brightness) return [d.on(), d.color(r, g, b), d.brightness(s.brightness)];
  const k = s.brightness / 100;
  return [d.on(), d.color(clampByte(r * k), clampByte(g * k), clampByte(b * k))];
}
