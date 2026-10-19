import { driverById, guessDriver, packetsFor, type Bytes, type LightDriver } from '../protocol';
import { rgbOf } from '../model/colors';
import type { Mode } from '../model/modes';
import type { ZoneId } from '../rules';

/** A controller the user has assigned to a zone. One zone can have several (e.g. left and right headlights). */
export type Assigned = { deviceId: string; name: string | null; zone: ZoneId; driverId?: string };

export type Job = { deviceId: string; driver: LightDriver; packets: Bytes[] };

export const driverFor = (a: Assigned): LightDriver => (a.driverId && driverById(a.driverId)) || guessDriver(a.name);

/** Pure: the packets every assigned controller needs to show `mode`. */
export function jobsFor(mode: Mode, devices: Assigned[]): Job[] {
  return devices.map((a) => {
    const z = mode.zones[a.zone];
    const driver = driverFor(a);
    return { deviceId: a.deviceId, driver, packets: packetsFor(driver, { on: z.on, rgb: rgbOf(z.color, z.custom), brightness: z.brightness }) };
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
