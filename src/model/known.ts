import type { Assigned } from '../engine/packets';
import type { ZoneId } from '../rules';
import { ZONES } from './modes';

/**
 * Controllers confirmed on havok's car (docs/PROTOCOLS.md, 2026-10-25), matched by advertised name.
 * Used to suggest a zone when they show up in a scan. Anything else is assigned by hand.
 */
export const KNOWN_CONTROLLERS: Record<string, { zone: ZoneId; label: string }> = {
  'ELK-BLEDOB F7': { zone: 'grille', label: 'Grille' },
  'ELK-BLEDOB 4B': { zone: 'engine', label: 'Engine bay' },
  'ELK-BLEDOB E7': { zone: 'under', label: 'Underglow' },
  'Dream-F231': { zone: 'tail', label: 'Left taillight' },
  'Dream-24BB': { zone: 'tail', label: 'Right taillight' },
};

export const knownFor = (name: string | null | undefined) => (name ? KNOWN_CONTROLLERS[name.trim()] : undefined);

/** Known controller names that still need assigning (not already assigned, not removed on purpose). */
export function missingKnown(devices: Assigned[], skipped: string[]): string[] {
  const have = new Set(devices.map((d) => (d.name ?? '').trim()));
  return Object.keys(KNOWN_CONTROLLERS).filter((n) => !have.has(n) && !skipped.includes(n));
}

/** Pure: which scanned devices to auto-assign, by advertised name. */
export function autoAssignments(found: { id: string; name: string | null }[], devices: Assigned[], skipped: string[]): Assigned[] {
  const want = new Set(missingKnown(devices, skipped));
  const taken = new Set(devices.map((d) => d.deviceId));
  const out: Assigned[] = [];
  for (const f of found) {
    const name = (f.name ?? '').trim();
    if (!want.has(name) || taken.has(f.id)) continue;
    want.delete(name);
    taken.add(f.id);
    out.push({ deviceId: f.id, name, zone: KNOWN_CONTROLLERS[name].zone });
  }
  return out;
}

/**
 * Zones worth showing: ones the car has a known controller for, plus any zone with a controller assigned.
 * Headlights stay hidden while they're stock (no controller), but come back if one is ever assigned.
 */
export function shownZones(devices: Assigned[]): ZoneId[] {
  const known = new Set(Object.values(KNOWN_CONTROLLERS).map((k) => k.zone));
  for (const d of devices) known.add(d.zone);
  return ZONES.filter((z) => known.has(z));
}
