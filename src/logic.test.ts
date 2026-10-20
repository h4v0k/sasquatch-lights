import { diffJobs, jobsFor } from './engine/packets';
import { hueToRgb } from './model/colors';
import { clampToRules, editZone, effectiveMode, modeMeetsRoadLock, SEED_MODES } from './model/modes';
import { driverById, guessDriver, packetsFor, parseTrionesStatus, TRIONES } from './protocol';
import { initialLatch, STOP_HOLD_MS, stateCode, stepLatch, trustedSpeed } from './roadlock/latch';
import { isDriving } from './roadlock/lock';
import { rulesFor } from './rules';

const hex = (b: number[]) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');
const FL = rulesFor('FL');
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

describe('road lock rules', () => {
  test('Road and Cruise meet Florida rules; Show does not', () => {
    expect(modeMeetsRoadLock(mode('road'), FL)).toBe(true);
    expect(modeMeetsRoadLock(mode('cruise'), FL)).toBe(true);
    expect(modeMeetsRoadLock(mode('show'), FL)).toBe(false);
  });
  test('Cruise underglow is illegal in an unknown state', () => {
    expect(modeMeetsRoadLock(mode('cruise'), rulesFor(null))).toBe(false);
  });
  test('underglow over 60% fails in Florida', () => {
    const m = editZone(mode('cruise'), 'under', { brightness: 80 }, false);
    expect(modeMeetsRoadLock(m, FL)).toBe(false);
  });
  test('amber headlights fail', () => {
    expect(modeMeetsRoadLock(editZone(mode('road'), 'head', { color: 'amber' }, false), FL)).toBe(false);
  });
  test('clampToRules makes any mode pass', () => {
    for (const m of SEED_MODES) {
      expect(modeMeetsRoadLock(clampToRules(m, FL), FL)).toBe(true);
      expect(modeMeetsRoadLock(clampToRules(m, rulesFor(null)), rulesFor(null))).toBe(true);
    }
  });
  test('headlights and taillights must be on while driving', () => {
    expect(modeMeetsRoadLock(editZone(mode('road'), 'head', { on: false }, false), FL)).toBe(false);
    const clamped = clampToRules(editZone(mode('road'), 'tail', { on: false }, false), FL);
    expect(clamped.zones.tail.on).toBe(true);
  });
  test('effective mode falls back to Road while driving', () => {
    expect(effectiveMode(SEED_MODES, 'show', true, FL).id).toBe('road');
    expect(effectiveMode(SEED_MODES, 'cruise', true, FL).id).toBe('cruise');
    expect(effectiveMode(SEED_MODES, 'show', false, FL).id).toBe('show');
  });
  test('effective mode while driving always passes, even if Road was edited out of bounds', () => {
    const broken = SEED_MODES.map((m) => (m.id === 'road' ? editZone(m, 'grille', { on: true, color: 'blue' }, false) : m));
    expect(modeMeetsRoadLock(effectiveMode(broken, 'show', true, FL), FL)).toBe(true);
  });
});

describe('color sync', () => {
  test('a color change goes to every zone', () => {
    const m = editZone(mode('show'), 'grille', { color: 'ice' }, true);
    expect(Object.values(m.zones).every((z) => z.color === 'ice')).toBe(true);
  });
  test('power and brightness stay per zone', () => {
    const m = editZone(mode('show'), 'grille', { brightness: 10 }, true);
    expect(m.zones.head.brightness).toBe(100);
  });
  test('hue strip', () => {
    expect(hueToRgb(0)).toEqual([255, 0, 0]);
    expect(hueToRgb(120)).toEqual([0, 255, 0]);
    expect(hueToRgb(240)).toEqual([0, 0, 255]);
  });
});

describe('driving latch', () => {
  test('turns on above 5 mph', () => {
    expect(stepLatch(initialLatch, 3, 0).driving).toBe(true);
    expect(stepLatch(initialLatch, 2, 0).driving).toBe(false);
  });
  test('stays on at a red light, turns off after a minute stopped', () => {
    let s = stepLatch(initialLatch, 10, 0);
    s = stepLatch(s, 0, 1000);
    s = stepLatch(s, 0, 1000 + STOP_HOLD_MS - 1);
    expect(s.driving).toBe(true);
    s = stepLatch(s, 0, 1000 + STOP_HOLD_MS);
    expect(s.driving).toBe(false);
  });
  test('creeping resets the stop timer', () => {
    let s = stepLatch(initialLatch, 10, 0);
    s = stepLatch(s, 0, 1000);
    s = stepLatch(s, 1.5, 30_000);
    s = stepLatch(s, 0, 40_000);
    s = stepLatch(s, 0, 40_000 + STOP_HOLD_MS - 1);
    expect(s.driving).toBe(true);
  });
  test('missing speed keeps the last state', () => {
    const on = stepLatch(initialLatch, 10, 0);
    expect(stepLatch(on, null, 99_999_999).driving).toBe(true);
  });
  test('state names map to codes', () => {
    expect(stateCode('Florida', 'US')).toBe('FL');
    expect(stateCode('FL', 'US')).toBe('FL');
    expect(stateCode('Ontario', 'CA')).toBeNull();
  });
});

describe('road lock fails safe', () => {
  const base = { latch: initialLatch, simulateDriving: false };
  test('locked until GPS is ok', () => {
    for (const gps of ['starting', 'stale', 'denied', 'unavailable'] as const) expect(isDriving({ ...base, gps })).toBe(true);
    expect(isDriving({ ...base, gps: 'ok' })).toBe(false);
  });
  test('simulate can only turn the lock on', () => {
    expect(isDriving({ ...base, gps: 'ok', simulateDriving: true })).toBe(true);
    expect(isDriving({ ...base, gps: 'starting', simulateDriving: false })).toBe(true);
  });
});

describe('trusted GPS speed', () => {
  const f = (lat: number, t: number, speed: number | null, accuracy: number | null = 5) => ({ lat, lon: -82.45, t, speed, accuracy });
  const deg100m = 100 / 111_320; // ~100 m of latitude
  test('a reported 0 with no previous fix is not trusted', () => {
    expect(trustedSpeed(null, f(27.95, 0, 0))).toBeNull();
  });
  test('a reported 0 while moving uses the derived speed', () => {
    const s = trustedSpeed(f(27.95, 0, 0), f(27.95 + deg100m, 5000, 0))!; // 100 m in 5 s = 20 m/s
    expect(s > 19 && s < 21).toBe(true);
  });
  test('parked: 0 reported and no movement reads as stopped', () => {
    expect(trustedSpeed(f(27.95, 0, 0), f(27.95, 2000, 0))).toBe(0);
  });
  test('a high reported speed is trusted on its own', () => {
    expect(trustedSpeed(null, f(27.95, 0, 25))).toBe(25);
  });
  test('poor accuracy or a long gap gives no derived speed', () => {
    expect(trustedSpeed(f(27.95, 0, 0, 200), f(27.95, 2000, 0, 200))).toBeNull();
    expect(trustedSpeed(f(27.95, 0, 0), f(27.95, 60_000, 0))).toBeNull();
  });
  test('out of order fixes give no derived speed', () => {
    expect(trustedSpeed(f(27.95, 5000, 0), f(27.95, 1000, 0))).toBeNull();
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
