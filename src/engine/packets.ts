import { driverById, guessDriver, packetsFor, type Bytes, type LightDriver } from '../protocol';
import { rgbOf, type Rgb } from '../model/colors';
import type { Mode } from '../model/modes';
import type { ZoneId } from '../rules';

/** A controller the user has assigned to a zone. One zone can have several (e.g. left and right headlights). */
export type Assigned = { deviceId: string; name: string | null; zone: ZoneId; driverId?: string };

export type Job = { deviceId: string; driver: LightDriver; packets: Bytes[] };

export const driverFor = (a: Assigned): LightDriver => (a.driverId && driverById(a.driverId)) || guessDriver(a.name);

/**
 * Pushes a color to full LED drive (brightest channel at 255) without changing its hue or saturation.
 * Presets like Sasquatch green (140, 200, 40) or bronze otherwise top out at 78–88% of what the LEDs can do;
 * dimming is the brightness slider's job, not the color's.
 */
export function fullDrive([r, g, b]: Rgb): Rgb {
  const max = Math.max(r, g, b);
  if (max === 0 || max === 255) return [r, g, b];
  const k = 255 / max;
  return [Math.round(r * k), Math.round(g * k), Math.round(b * k)];
}

/** Pure: the packets every assigned controller needs to show `mode`. */
export function jobsFor(mode: Mode, devices: Assigned[]): Job[] {
  return devices.map((a) => {
    const z = mode.zones[a.zone];
    const driver = driverFor(a);
    return { deviceId: a.deviceId, driver, packets: packetsFor(driver, { on: z.on, rgb: fullDrive(rgbOf(z.color, z.custom)), brightness: z.brightness }) };
  });
}

/** Skips controllers whose packets haven't changed since the last send. */
export function diffJobs(next: Job[], last: Map<string, string>): Job[] {
  return next.filter((j) => {
    const key = JSON.stringify(j.packets);
    if (last.get(j.deviceId) === key) return false;
    last.set(j.deviceId, key);
    return true;
  });
}
