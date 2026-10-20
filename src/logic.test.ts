import { diffJobs, jobsFor } from './engine/packets';
import { hueToRgb } from './model/colors';
import { applyFrontFloor, clampToRules, editZone, effectiveMode, isPoliceColor, modeMeetsRoadLock, SEED_MODES } from './model/modes';
import { driverById, guessDriver, packetsFor, parseTrionesStatus, TRIONES } from './protocol';
import { stateCode } from './roadlock/region';
import { rulesFor } from './rules';

const hex = (b: number[]) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');
const FL = rulesFor('FL')!;
const mode = (id: string) => SEED_MODES.find((m) => m.id === id)!;

describe('drivers match docs/PROTOCOLS.md', () => {
  test('ELK-BLEDOM generic', () => {
    const d = guessDriver('ELK-BLEDOM');
    expect(d.id).toBe('elk-generic');
    expect(hex(d.on())).toBe('7e 00 04 f0 00 01 ff 00 ef');
    expect(hex(d.off())).toBe('7e 00 04 00 00 00 ff 00 ef');
    expect(hex(d.color(255, 0, 128))).toBe('7e 00 05 03 ff 00 80 00 ef');
    expect(hex(d.brightness!(60))).toBe('7e 00 01 3c ff 00 ff 00 ef');
    expect(d.write).toEqual(['fff3']);
  });
  test('ELK-BLEDOB', () => {
    const d = guessDriver('ELK-BLEDOB');
    expect(hex(d.on())).toBe('7e 07 04 ff 00 01 02 01 ef');
    expect(hex(d.color(1, 2, 3))).toBe('7e 07 05 03 01 02 03 0a ef');
    expect(hex(d.brightness!(100))).toBe('7e 04 01 64 01 ff 02 01 ef');
  });
  test('LED- variant swaps green and blue', () => {
    expect(hex(driverById('led-dash')!.color(10, 20, 30))).toBe('7e 07 05 03 0a 1e 14 00 ef');
  });
  test('Triones', () => {
    expect(guessDriver('Triones-1234').id).toBe('triones');
    expect(hex(TRIONES.on())).toBe('cc 23 33');
    expect(hex(TRIONES.off())).toBe('cc 24 33');
    expect(hex(TRIONES.color(255, 0, 0))).toBe('56 ff 00 00 00 f0 aa');
    expect(TRIONES.brightness).toBeNull();
  });
  test('Triones brightness scales RGB', () => {
    expect(packetsFor(TRIONES, { on: true, rgb: [200, 100, 50], brightness: 50 }).map(hex)).toEqual(['cc 23 33', '56 64 32 19 00 f0 aa']);
  });
  test('off sends only the off packet', () => {
    expect(packetsFor(TRIONES, { on: false, rgb: [1, 2, 3], brightness: 100 }).map(hex)).toEqual(['cc 24 33']);
  });
  test('values are clamped', () => {
    expect(hex(guessDriver('ELK').color(300, -5, 12.6))).toBe('7e 00 05 03 ff 00 0d 00 ef');
  });
  test('Triones status parse', () => {
    expect(parseTrionesStatus([0x66, 0x04, 0x23, 0x41, 0x20, 0x05, 1, 2, 3, 0, 0x03, 0x99])).toEqual({ on: true, mode: 0x41, speed: 5, rgb: [1, 2, 3], white: 0 });
    expect(parseTrionesStatus([0x00])).toBeNull();
  });
});

describe('Road lock rules (Florida)', () => {
  test('Road and Cruise fit; Show does not', () => {
    expect(modeMeetsRoadLock(mode('road'), FL)).toBe(true);
    expect(modeMeetsRoadLock(mode('cruise'), FL)).toBe(true);
    expect(modeMeetsRoadLock(mode('show'), FL)).toBe(false);
  });
  test('underglow over 60% fails', () => {
    expect(modeMeetsRoadLock(editZone(mode('cruise'), 'under', { brightness: 80 }, false), FL)).toBe(false);
  });
  test('amber headlights fail', () => {
    expect(modeMeetsRoadLock(editZone(mode('road'), 'head', { color: 'amber' }, false), FL)).toBe(false);
  });
  test('headlights and taillights must be on', () => {
    expect(modeMeetsRoadLock(editZone(mode('road'), 'head', { on: false }, false), FL)).toBe(false);
    expect(clampToRules(editZone(mode('road'), 'tail', { on: false }, false), FL).zones.tail.on).toBe(true);
  });
  test('clampToRules makes any mode fit', () => {
    for (const m of SEED_MODES) expect(modeMeetsRoadLock(clampToRules(m, FL), FL)).toBe(true);
  });
});

describe('Road lock switch', () => {
  test('lock on in Florida: a mode outside the rules falls back to Road', () => {
    expect(effectiveMode(SEED_MODES, 'show', true, FL).id).toBe('road');
    expect(effectiveMode(SEED_MODES, 'cruise', true, FL).id).toBe('cruise');
  });
  test('lock off: the chosen mode runs', () => {
    expect(effectiveMode(SEED_MODES, 'show', false, FL).id).toBe('show');
  });
  test('lock on but no location or no rule set: fails open', () => {
    expect(rulesFor(null)).toBeNull();
    expect(rulesFor('NY')).toBeNull();
    expect(modeMeetsRoadLock(mode('show'), null)).toBe(true);
    expect(effectiveMode(SEED_MODES, 'show', true, null).id).toBe('show');
  });
  test('whatever runs with the lock on in Florida fits, even if Road was edited out of bounds', () => {
    const broken = SEED_MODES.map((m) => (m.id === 'road' ? editZone(m, 'grille', { on: true, color: 'cyan' }, false) : m));
    expect(modeMeetsRoadLock(effectiveMode(broken, 'show', true, FL), FL)).toBe(true);
  });
});

describe('red and blue are always blocked up front', () => {
  const blueFront = editZone(editZone(mode('show'), 'head', { color: 'blue' }, false), 'tail', { color: 'blue' }, false);
  test('front zones fall back to white; the rear keeps its color', () => {
    const m = applyFrontFloor(blueFront);
    expect(m.zones.head.color).toBe('white');
    expect(m.zones.tail.color).toBe('blue');
  });
  test('custom red on the underglow is blocked too', () => {
    expect(applyFrontFloor(editZone(mode('show'), 'under', { color: 'custom', custom: [250, 20, 20] }, false)).zones.under.color).toBe('white');
    expect(applyFrontFloor(mode('show')).zones.under.color).toBe('olive');
  });
  test('applies with the lock off, on, and with no location', () => {
    const modes = SEED_MODES.map((m) => (m.id === 'show' ? blueFront : m));
    for (const [lock, rules] of [[false, FL], [true, null], [false, null]] as const) {
      expect(effectiveMode(modes, 'show', lock, rules).zones.head.color).toBe('white');
    }
  });
  test('police color check', () => {
    expect(isPoliceColor([255, 0, 0])).toBe(true);
    expect(isPoliceColor([0, 60, 255])).toBe(true);
    expect(isPoliceColor([255, 140, 0])).toBe(false);
    expect(isPoliceColor([150, 60, 255])).toBe(false); // purple
    for (const c of [[160, 0, 0], [255, 40, 40], [0, 0, 169], [0, 150, 255], [90, 190, 255], [100, 100, 255]] as const) expect(isPoliceColor([...c])).toBe(true);
    for (const c of [[255, 50, 170], [224, 110, 30], [0, 230, 210], [140, 200, 40], [255, 255, 255], [243, 246, 255], [30, 0, 0], [255, 200, 200]] as const) expect(isPoliceColor([...c])).toBe(false);
    for (const c of [[170, 210, 255], [200, 230, 255], [255, 140, 140]] as const) expect(isPoliceColor([...c])).toBe(true); // pale blue, pale red
  });
});

describe('color sync', () => {
  test('a color change goes to every zone', () => {
    const m = editZone(mode('show'), 'grille', { color: 'bronze' }, true);
    expect(Object.values(m.zones).every((z) => z.color === 'bronze')).toBe(true);
  });
  test('red picked on the taillights is not synced to the front', () => {
    const m = editZone(mode('show'), 'tail', { color: 'red' }, true);
    expect(m.zones.engine.color).toBe('red');
    expect(m.zones.head.color).toBe('olive');
    expect(m.zones.under.color).toBe('olive');
  });
  test('power and brightness stay per zone', () => {
    expect(editZone(mode('show'), 'grille', { brightness: 10 }, true).zones.head.brightness).toBe(100);
  });
  test('hue strip', () => {
    expect(hueToRgb(0)).toEqual([255, 0, 0]);
    expect(hueToRgb(120)).toEqual([0, 255, 0]);
    expect(hueToRgb(240)).toEqual([0, 0, 255]);
  });
});

describe('state lookup', () => {
  test('state names map to codes', () => {
    expect(stateCode('Florida', 'US')).toBe('FL');
    expect(stateCode('FL', 'US')).toBe('FL');
    expect(stateCode('Ontario', 'CA')).toBeNull();
  });
});

describe('light engine packets', () => {
  const devices = [
    { deviceId: 'a', name: 'ELK-BLEDOM', zone: 'under' as const },
    { deviceId: 'b', name: 'Triones-1', zone: 'head' as const },
  ];
  test('builds per-controller packets from the mode', () => {
    const jobs = jobsFor(mode('road'), devices);
    expect(jobs.find((j) => j.deviceId === 'a')!.packets.map(hex)).toEqual(['7e 00 04 00 00 00 ff 00 ef']);
    expect(jobs.find((j) => j.deviceId === 'b')!.packets.map(hex)).toEqual(['cc 23 33', '56 ff ff ff 00 f0 aa']);
  });
  test('only resends what changed', () => {
    const last = new Map<string, string>();
    expect(diffJobs(jobsFor(mode('road'), devices), last)).toHaveLength(2);
    expect(diffJobs(jobsFor(mode('road'), devices), last)).toHaveLength(0);
    const changed = editZone(mode('road'), 'under', { on: true }, false);
    expect(diffJobs(jobsFor(changed, devices), last).map((j) => j.deviceId)).toEqual(['a']);
  });
  test('a manual driver choice wins over the name guess', () => {
    const jobs = jobsFor(mode('road'), [{ deviceId: 'c', name: 'ELK-BLEDOM', zone: 'head', driverId: 'elk-dob' }]);
    expect(jobs[0].driver.id).toBe('elk-dob');
  });
});
