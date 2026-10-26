import type { ZoneId } from '../rules';

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
