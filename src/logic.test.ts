import { diffJobs, fullDrive, jobsFor } from './engine/packets';
import { hueToRgb } from './model/colors';
import { rgbOf } from './model/colors';
import { applyFrontFloor, clampToRules, editZone, effectiveMode, isPoliceColor, matchAll, modeMeetsRoadLock, SEED_MODES, snapOffPolice, ZONES } from './model/modes';
import { driverById, guessDriver, packetsFor, parseTrionesStatus, TRIONES } from './protocol';
import { ENGAGE_MPH, newTracker, onReading, onTick, RELEASE_MS } from './roadlock/motion';
import { stateCode } from './roadlock/region';
import { BASELINE, rulesFor } from './rules';
import { lockActive } from './roadlock/lock';

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

describe('Road lock snaps lights to legal (Florida)', () => {
  const show = mode('show');
  const locked = (m = show) => clampToRules(m, FL);
  test('headlights go white and taillights red, both on', () => {
    const off = editZone(editZone(show, 'head', { on: false }, false), 'tail', { on: false }, false);
    const m = locked(off);
    expect(m.zones.head).toMatchObject({ on: true, color: 'white' });
    expect(m.zones.tail).toMatchObject({ on: true, color: 'red' });
  });
  test('allowed accent colors stay as picked, at full brightness', () => {
    const m = locked(editZone(show, 'under', { color: 'purple', brightness: 100 }, false));
    expect(m.zones.under).toMatchObject({ on: true, color: 'purple', brightness: 100 });
    expect(m.zones.grille.color).toBe('olive');
    expect(m.zones.engine.color).toBe('bronze');
  });
  test('red or blue accents shift off red and blue; nothing is switched off', () => {
    for (const k of ['under', 'grille', 'engine'] as const) {
      for (const c of ['red', 'blue', 'ice'] as const) {
        const z = locked(editZone(show, k, { color: c }, false)).zones[k];
        expect(z.on).toBe(true);
        expect(isPoliceColor(rgbOf(z.color, z.custom))).toBe(false);
      }
    }
  });
  test('accents that are off stay off', () => {
    expect(locked(mode('road')).zones.under.on).toBe(false);
  });
  test('the active mode is kept, never swapped for Road', () => {
    expect(effectiveMode(SEED_MODES, 'show', true, FL).id).toBe('show');
  });
  test('every seed mode is legal once snapped', () => {
    for (const m of SEED_MODES) expect(modeMeetsRoadLock(locked(m), FL)).toBe(true);
    expect(modeMeetsRoadLock(mode('road'), FL)).toBe(true);
    expect(modeMeetsRoadLock(show, FL)).toBe(false);
  });
  test('the lock never fails open: unknown state uses the baseline', () => {
    expect(rulesFor(null)).toBe(BASELINE);
    expect(rulesFor('NY')).toBe(BASELINE);
    const m = effectiveMode(SEED_MODES, 'show', true, null);
    expect(m.zones.head.color).toBe('white');
    expect(m.zones.tail.color).toBe('red');
  });
  test('lock off: the chosen mode runs as saved', () => {
    expect(effectiveMode(SEED_MODES, 'show', false, FL).zones.head.color).toBe('olive');
  });
});

describe('snapOffPolice', () => {
  test('moves every red and blue hue out of the blocked bands, keeping brightness', () => {
    for (let h = 0; h < 360; h += 2) {
      const rgb = hueToRgb(h);
      const out = snapOffPolice(rgb);
      expect(isPoliceColor(out)).toBe(false);
      expect(Math.max(...out)).toBeGreaterThanOrEqual(250);
    }
  });
  test('red goes warm (orange or pink), blue goes cyan or purple', () => {
    const [r, g, b] = snapOffPolice([255, 0, 0]);
    expect(r).toBe(255); expect(b).toBe(0); expect(g).toBeGreaterThan(80);
    const deep = snapOffPolice([0, 60, 255]); // hue 226: to purple
    expect(deep[2]).toBe(255); expect(deep[0]).toBeGreaterThan(deep[1]);
    const sky = snapOffPolice([0, 160, 255]); // hue 202: to cyan
    expect(sky[0]).toBe(0); expect(sky[1]).toBeGreaterThan(200);
  });
  test('allowed colors pass through', () => {
    expect(snapOffPolice([140, 200, 40])).toEqual([140, 200, 40]);
  });
});

describe('match all lights', () => {
  test('one color on every light, all on', () => {
    const m = matchAll(mode('road'), 'custom', [0, 255, 120]);
    for (const k of ZONES) expect(m.zones[k]).toMatchObject({ on: true, color: 'custom', custom: [0, 255, 120] });
  });
  test('red never goes to the front', () => {
    const m = matchAll(mode('show'), 'red', [255, 0, 0]);
    expect(m.zones.tail.color).toBe('red');
    expect(m.zones.head.color).toBe('olive');
  });
});

describe('Auto Road lock by speed', () => {
  const feed = (readings: (number | null)[], start = 0, step = 2000) => {
    let t = newTracker();
    readings.forEach((mph, i) => (t = onReading(t, mph, start + i * step)));
    return t;
  };
  test('locks after two readings at 15 mph or more', () => {
    expect(feed([ENGAGE_MPH]).moving).toBe(false);
    expect(feed([ENGAGE_MPH, ENGAGE_MPH]).moving).toBe(true);
    expect(feed([30, 2, 30]).moving).toBe(false); // a single glitch doesn't count
  });
  test('stays locked at a red light, lets go after 2 minutes stopped', () => {
    let t = feed([40, 40]);
    t = onReading(t, 0, 10_000);
    t = onReading(t, 0, 10_000 + RELEASE_MS - 1);
    expect(t.moving).toBe(true);
    t = onReading(t, 0, 10_000 + RELEASE_MS);
    expect(t.moving).toBe(false);
  });
  test('slow rolling (over 3 mph) keeps it locked', () => {
    let t = feed([40, 40]);
    for (let i = 0; i < 100; i++) t = onReading(t, 8, 10_000 + i * 5000);
    expect(t.moving).toBe(true);
  });
  test('GPS lost for 2 minutes lets go', () => {
    const t = feed([40, 40]);
    expect(onTick(t, 2000 + RELEASE_MS - 1).moving).toBe(true);
    expect(onTick(t, 2000 + RELEASE_MS).moving).toBe(false);
  });
  test('lock modes', () => {
    const base = { location: 'ok' as const, motion: { moving: false, mph: 0, source: 'gps' as const } };
    expect(lockActive({ ...base, lockMode: 'auto' })).toBe(false);
    expect(lockActive({ ...base, lockMode: 'auto', motion: { moving: true, mph: 40, source: 'gps' } })).toBe(true);
    expect(lockActive({ ...base, lockMode: 'parade', motion: { moving: true, mph: 40, source: 'gps' } })).toBe(false);
    expect(lockActive({ ...base, lockMode: 'on' })).toBe(true);
    expect(lockActive({ lockMode: 'auto', location: 'denied', motion: { moving: false, mph: null, source: 'none' } })).toBe(true);
    expect(lockActive({ lockMode: 'auto', location: 'ok', motion: { moving: false, mph: null, source: 'none' } })).toBe(false);
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
    for (const [lock, rules] of [[false, FL], [true, null], [false, null], [true, FL]] as const) {
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
  test('colors go out at full LED drive, same hue', () => {
    expect(fullDrive([140, 200, 40])).toEqual([179, 255, 51]);
    expect(fullDrive([255, 140, 0])).toEqual([255, 140, 0]);
    expect(fullDrive([0, 0, 0])).toEqual([0, 0, 0]);
    const show = jobsFor(mode('show'), [{ deviceId: 't', name: 'Triones-1', zone: 'tail' }]);
    expect(show[0].packets.map(hex)).toEqual(['cc 23 33', '56 b3 ff 33 00 f0 aa']);
  });
  test('a manual driver choice wins over the name guess', () => {
    const jobs = jobsFor(mode('road'), [{ deviceId: 'c', name: 'ELK-BLEDOM', zone: 'head', driverId: 'elk-dob' }]);
    expect(jobs[0].driver.id).toBe('elk-dob');
  });
});

describe('Bluetooth byte helpers', () => {
  const { toBase64, shortUuid, backoffMs } = require('./transport/bytes');
  test('base64 matches standard encoding', () => {
    expect(toBase64([0x7e, 0x00, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef])).toBe('fgAE8AAB/wDv');
    expect(toBase64([0xcc, 0x23, 0x33])).toBe('zCMz');
    expect(toBase64([0x56, 0xff, 0x00, 0x00, 0x00, 0xf0, 0xaa])).toBe('Vv8AAADwqg==');
    expect(toBase64([0xef, 0x01])).toBe('7wE=');
  });
  test('short uuids', () => {
    expect(shortUuid('0000FFF3-0000-1000-8000-00805F9B34FB')).toBe('fff3');
    expect(shortUuid('ffd9')).toBe('ffd9');
  });
  test('backoff grows then caps', () => {
    expect([0, 1, 2, 3, 4, 9].map(backoffMs)).toEqual([1000, 2000, 4000, 8000, 15000, 15000]);
  });
});

describe('controllers verified on the car', () => {
  const { knownFor } = require('./model/known');
  test('names map to zones and protocols', () => {
    expect(knownFor('ELK-BLEDOB F7').zone).toBe('grille');
    expect(knownFor('ELK-BLEDOB E7').zone).toBe('under');
    expect(knownFor('Dream-24BB').zone).toBe('tail');
    expect(knownFor('Something else')).toBeUndefined();
    expect(guessDriver('Dream-F231').id).toBe('triones');
    expect(guessDriver('ELK-BLEDOB 4B').write).toEqual(['fff3']);
  });
});

describe('color wheel math', () => {
  const { hsvToRgb, rgbToHs, wheelColor } = require('./model/colors');
  test('hsv corners', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0]);
    expect(hsvToRgb(120, 1, 1)).toEqual([0, 255, 0]);
    expect(hsvToRgb(240, 0, 1)).toEqual([255, 255, 255]);
  });
  test('wheel: center is white, right edge is red, bottom edge is 90°', () => {
    expect(wheelColor(0, 0, 100).rgb).toEqual([255, 255, 255]);
    expect(wheelColor(100, 0, 100).rgb).toEqual([255, 0, 0]);
    expect(Math.round(wheelColor(0, 100, 100).h)).toBe(90);
  });
  test('round trip places the knob back where it was', () => {
    const { rgb } = wheelColor(-30, 50, 100);
    const { h, s } = rgbToHs(rgb);
    expect(Math.abs(h - wheelColor(-30, 50, 100).h)).toBeLessThan(1.5);
    expect(Math.abs(s - Math.hypot(30, 50) / 100)).toBeLessThan(0.02);
  });
});

describe('auto-assign known controllers', () => {
  const { autoAssignments, missingKnown } = require('./model/known');
  const found = [
    { id: 'AA', name: 'ELK-BLEDOB F7' }, { id: 'BB', name: 'Dream-F231' }, { id: 'CC', name: 'Dream-24BB' },
    { id: 'DD', name: 'DRGPR-B8D27E' }, { id: 'EE', name: null },
  ];
  test('assigns only known names, both taillights to the tail zone', () => {
    const a = autoAssignments(found, [], []);
    expect(a.map((x: any) => [x.deviceId, x.zone])).toEqual([['AA', 'grille'], ['BB', 'tail'], ['CC', 'tail']]);
  });
  test('skips already-assigned and removed-on-purpose controllers', () => {
    const devices = [{ deviceId: 'AA', name: 'ELK-BLEDOB F7', zone: 'grille' }];
    expect(autoAssignments(found, devices, ['Dream-24BB']).map((x: any) => x.deviceId)).toEqual(['BB']);
    expect(missingKnown(devices, ['Dream-24BB'])).toEqual(['ELK-BLEDOB 4B', 'ELK-BLEDOB E7', 'Dream-F231']);
  });
});

describe('reconnect finder scan budget', () => {
  const { scanBudget, MAX_SCANS_PER_WINDOW, SCAN_WINDOW_MS } = require('./transport/finder');
  test('stays under Android\'s 5 scans per 30 seconds', () => {
    let starts: number[] = [];
    let ok = 0;
    for (let t = 0; t < SCAN_WINDOW_MS; t += 1000) {
      const b = scanBudget(starts, t);
      starts = b.recent;
      if (b.ok) { starts.push(t); ok++; }
    }
    expect(ok).toBe(MAX_SCANS_PER_WINDOW);
    expect(MAX_SCANS_PER_WINDOW).toBeLessThan(5);
    expect(scanBudget(starts, SCAN_WINDOW_MS).ok).toBe(true);
  });
});
