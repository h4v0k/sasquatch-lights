import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State, type Device, type Subscription } from 'react-native-ble-plx';
import type { Bytes } from '../protocol';
import { backoffMs, hex, shortUuid, sleep, toBase64 } from './bytes';
import { DIRECT_FALLBACK_MS, DIRECT_RETRIES, FIND_SCAN_MS, scanBudget } from './finder';
import type { FoundDevice, LightTransport, LinkState, LogLine } from './types';

type Writable = { service: string; char: string; noResponse: boolean };

type Link = {
  state: LinkState;
  /** Write characteristics found on the device, keyed by 16-bit uuid ("fff3", "ffd9"). */
  chars: Map<string, Writable>;
  attempt: number;
  retry: ReturnType<typeof setTimeout> | null;
  sub: Subscription | null;
  busy: boolean;
  /** Last direct connect try, for the slow fallback when the finder never hears the box. */
  lastTry: number;
};

/**
 * Real Bluetooth via react-native-ble-plx. Verified on havok's car 2026-10-25:
 * Opt7 ELK-BLEDOB boxes (write fff3) and Heritage X "Dream-" taillights (write ffd9).
 *
 * Every connected device is "wanted": if it drops, we reconnect with backoff until disconnect() is called.
 * The light engine re-sends full state on each 'connected', which also powers the box back on
 * (color commands do nothing while an ELK box is off).
 */
export class BleTransport implements LightTransport {
  readonly kind = 'ble' as const;
  readonly log: LogLine[] = [];
  private manager = new BleManager();
  private links = new Map<string, Link>();
  private names = new Map<string, string>();
  private listeners = new Set<(id: string, s: LinkState, d?: string) => void>();
  private logListeners = new Set<() => void>();
  private powered = false;
  /** One connect at a time: Android's Bluetooth stack drops parallel connects (GATT error 133). */
  private gate: Promise<void> = Promise.resolve();
  /** A user scan (Devices screen or auto-assign) is running; the finder stays out of its way. */
  private userScanning = false;
  /** Every scan start, for Android's 5-scans-per-30-seconds limit. */
  private scanStarts: number[] = [];
  private finding = false;
  /** Bumped on every scan start, so the finder only stops its own scan. */
  private scanToken = 0;
  private inFlight = 0;

  constructor() {
    this.manager.onStateChange((s) => {
      const was = this.powered;
      this.powered = s === State.PoweredOn;
      if (s === State.PoweredOff) this.add('Bluetooth is off. Turn it on to reach the lights.');
      if (this.powered && !was) for (const id of this.links.keys()) this.kick(id, 0);
    }, true);
    setInterval(() => void this.findTick(), 3000);
  }

  /** Starts a scan if the budget allows; false when Android would silently block it. */
  private startScan(cb: Parameters<BleManager['startDeviceScan']>[2]): boolean {
    const now = Date.now();
    const b = scanBudget(this.scanStarts, now);
    this.scanStarts = b.recent;
    if (!b.ok) return false;
    this.scanStarts.push(now);
    this.scanToken++;
    this.manager.startDeviceScan(null, { allowDuplicates: false }, cb);
    return true;
  }

  /**
   * One shared search for every saved light that isn't connected: listen for a few seconds, then connect
   * to the ones that were heard, one at a time. Never runs during a connect or a user scan.
   */
  private async findTick() {
    if (!this.powered || this.finding || this.userScanning || this.inFlight > 0) return;
    const waiting = [...this.links.entries()].filter(([, l]) => l.state !== 'connected' && !l.busy && !l.retry);
    if (waiting.length === 0) return;
    const now = Date.now();
    // Slow fallback: a direct try for any box the finder hasn't heard in a while.
    for (const [id, l] of waiting) if (now - l.lastTry >= DIRECT_FALLBACK_MS) this.kick(id, 0);
    const ids = new Set(waiting.map(([id]) => id));
    const heard = new Set<string>();
    this.finding = true;
    try {
      const started = this.startScan((err, d) => {
        if (!err && d && ids.has(d.id)) heard.add(d.id);
      });
      if (!started) return;
      const mine = this.scanToken;
      await sleep(FIND_SCAN_MS);
      if (this.scanToken === mine) this.manager.stopDeviceScan();
    } finally {
      this.finding = false;
    }
    for (const id of heard) {
      this.add(`${this.label(id)}: heard it, connecting`);
      this.kick(id, 0);
    }
  }

  // ---------- permissions ----------

  private async permitted(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    const P = PermissionsAndroid.PERMISSIONS;
    // Android 12+ has Bluetooth permissions; Android 11 and older (havok's phone is 10) need location to scan.
    const wanted = api >= 31 ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT] : [P.ACCESS_FINE_LOCATION];
    const res = await PermissionsAndroid.requestMultiple(wanted);
    return wanted.every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
  }

  // ---------- scan ----------

  scan(onFound: (d: FoundDevice) => void, onError?: (message: string) => void) {
    let stopped = false;
    this.userScanning = true;
    (async () => {
      if (!(await this.permitted())) {
        onError?.('Bluetooth permission is off. Allow it in Settings → Apps → Sasquatch Lights → Permissions.');
        return;
      }
      if (stopped) return;
      if (this.finding) { this.manager.stopDeviceScan(); this.finding = false; }
      const ok = this.startScan((err, d) => {
        if (err) {
          this.add(`Scan failed: ${err.message}`);
          onError?.(scanHint(err.message));
          return;
        }
        if (!d) return;
        const name = d.localName ?? d.name ?? null;
        if (name) this.names.set(d.id, name);
        onFound({ id: d.id, name, rssi: d.rssi ?? null });
      });
      if (!ok) onError?.('Bluetooth is resting after a lot of scans. Try again in 30 seconds.');
    })();
    return () => {
      stopped = true;
      this.userScanning = false;
      this.manager.stopDeviceScan();
    };
  }


  // ---------- connect ----------

  /** `services` is unused on Android (we discover everything); kept to match LightTransport. */
  async connect(deviceId: string, _services: string[] = []) {
    if (!this.links.has(deviceId)) {
      this.links.set(deviceId, { state: 'disconnected', chars: new Map(), attempt: 0, retry: null, sub: null, busy: false, lastTry: 0 });
    }
    if (!(await this.permitted())) {
      this.setState(deviceId, 'error', 'Bluetooth permission is off');
      return;
    }
    this.kick(deviceId, 0);
  }

  async disconnect(deviceId: string) {
    const l = this.links.get(deviceId);
    this.links.delete(deviceId);
    if (l) {
      if (l.retry) clearTimeout(l.retry);
      l.sub?.remove();
    }
    try { await this.manager.cancelDeviceConnection(deviceId); } catch { /* already gone */ }
    this.emit(deviceId, 'disconnected');
  }

  /** Schedules a connect attempt for a wanted device. */
  private kick(id: string, delay: number) {
    const l = this.links.get(id);
    if (!l || l.busy || l.state === 'connected') return;
    if (l.retry) clearTimeout(l.retry);
    l.retry = setTimeout(() => { l.retry = null; void this.attempt(id); }, delay);
  }

  private async attempt(id: string) {
    const l = this.links.get(id);
    if (!l || l.busy) return;
    if (!this.powered) { this.setState(id, 'error', 'Bluetooth is off'); return; }
    l.busy = true;
    this.setState(id, 'connecting');
    // Wait our turn: connects run one after another.
    const prev = this.gate;
    let release!: () => void;
    this.gate = new Promise<void>((r) => (release = r));
    this.inFlight++;
    await prev;
    // A scan running while connecting makes Android connects fail; the finder may have one going.
    while (this.finding) await sleep(200);
    try {
      if (!this.links.has(id)) return;
      l.lastTry = Date.now();
      // A box keeps a stale link if the app was killed; clear it so this connect isn't refused.
      if (await this.manager.isDeviceConnected(id).catch(() => false)) {
        await this.manager.cancelDeviceConnection(id).catch(() => undefined);
        await sleep(400);
      }
      const d: Device = await this.manager.connectToDevice(id, { timeout: 10000, autoConnect: false });
      await d.discoverAllServicesAndCharacteristics();
      const chars = new Map<string, Writable>();
      for (const s of await d.services()) {
        for (const c of await s.characteristics()) {
          if (c.isWritableWithoutResponse || c.isWritableWithResponse) {
            chars.set(shortUuid(c.uuid), { service: s.uuid, char: c.uuid, noResponse: c.isWritableWithoutResponse });
          }
        }
      }
      if (!this.links.has(id)) { await this.manager.cancelDeviceConnection(id).catch(() => undefined); return; }
      l.chars = chars;
      l.attempt = 0;
      l.sub?.remove();
      l.sub = this.manager.onDeviceDisconnected(id, (err) => {
        const still = this.links.get(id);
        if (!still) return;
        still.chars = new Map();
        this.setState(id, 'disconnected', err?.message);
        this.add(`${this.label(id)}: dropped (${err?.message ?? 'no reason given'}), reconnecting`);
        still.busy = false;
        still.attempt = 0;
        this.kick(id, 500); // it was just here; try straight away
      });
      this.add(`${this.label(id)}: connected (${[...chars.keys()].join(', ') || 'no write channel'})`);
      l.busy = false;
      this.setState(id, 'connected');
      // Let the light engine's first writes land before the next connect starts.
      await sleep(600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      l.busy = false;
      if (!this.links.has(id)) return;
      this.setState(id, 'error', msg);
      if (l.attempt < DIRECT_RETRIES) {
        this.add(`${this.label(id)}: connect failed (${msg}), retrying`);
        this.kick(id, backoffMs(l.attempt++));
      } else {
        l.attempt++;
        this.add(`${this.label(id)}: connect failed (${msg}), listening for it`);
      }
    } finally {
      this.inFlight--;
      release();
    }
  }

  // ---------- send ----------

  async send(deviceId: string, writeChars: string[], packets: Bytes[], gapMs: number) {
    const l = this.links.get(deviceId);
    if (!l || l.state !== 'connected') throw new Error('not connected');
    const w = writeChars.map((u) => l.chars.get(u.toLowerCase())).find(Boolean);
    if (!w) {
      this.add(`${this.label(deviceId)}: no ${writeChars.join('/')} channel. Pick another protocol for it.`);
      throw new Error('no write characteristic');
    }
    for (let i = 0; i < packets.length; i++) {
      if (i > 0 && gapMs > 0) await sleep(gapMs);
      const b64 = toBase64(packets[i]);
      try {
        if (w.noResponse) await this.manager.writeCharacteristicWithoutResponseForDevice(deviceId, w.service, w.char, b64);
        else await this.manager.writeCharacteristicWithResponseForDevice(deviceId, w.service, w.char, b64);
      } catch (e) {
        this.add(`${this.label(deviceId)}: write failed (${e instanceof Error ? e.message : e})`);
        throw e;
      }
      this.add(`${this.label(deviceId)} ${shortUuid(w.char)} ← ${hex(packets[i])}`);
    }
  }

  // ---------- state + log ----------

  stateOf(deviceId: string): LinkState {
    return this.links.get(deviceId)?.state ?? 'disconnected';
  }

  onState(listener: (id: string, s: LinkState, d?: string) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  onLog(listener: () => void) {
    this.logListeners.add(listener);
    return () => { this.logListeners.delete(listener); };
  }

  /** Lets the app label log lines with the advertised name it stored at assign time. */
  rememberName(id: string, name: string | null) {
    if (name) this.names.set(id, name);
  }

  private label(id: string) {
    return this.names.get(id) ?? id;
  }

  private setState(id: string, s: LinkState, detail?: string) {
    const l = this.links.get(id);
    if (l) l.state = s;
    this.emit(id, s, detail);
  }

  private emit(id: string, s: LinkState, detail?: string) {
    this.listeners.forEach((fn) => fn(id, s, detail));
  }

  private add(text: string) {
    this.log.unshift({ at: Date.now(), text });
    this.log.splice(120);
    this.logListeners.forEach((fn) => fn());
  }
}

function scanHint(message: string) {
  if (/location/i.test(message)) return 'Turn on Location in quick settings. Android 10 needs it on to find Bluetooth devices.';
  if (/powered off|bluetooth.*off/i.test(message)) return 'Bluetooth is off. Turn it on and scan again.';
  return `Scan failed: ${message}`;
}
