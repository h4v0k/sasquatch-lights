import type { Bytes } from '../protocol';
import { hex } from './bytes';
import type { FoundDevice, LightTransport, LinkState, LogLine } from './types';

/** Stand-in with no Bluetooth: pretends to connect and logs every packet. Handy for UI work. */
export class DemoTransport implements LightTransport {
  readonly kind = 'demo' as const;
  readonly log: LogLine[] = [];
  private states = new Map<string, LinkState>();
  private listeners = new Set<(id: string, s: LinkState, d?: string) => void>();
  private logListeners = new Set<() => void>();

  scan(onFound: (d: FoundDevice) => void) {
    const t = setTimeout(() => {
      onFound({ id: 'demo-elk-1', name: 'ELK-BLEDOB F7', rssi: -58 });
      onFound({ id: 'demo-triones-1', name: 'Dream-F231', rssi: -64 });
    }, 400);
    return () => clearTimeout(t);
  }

  async connect(deviceId: string) { this.emit(deviceId, 'connected'); }
  async disconnect(deviceId: string) { this.emit(deviceId, 'disconnected'); }

  async send(deviceId: string, writeChars: string[], packets: Bytes[]) {
    for (const p of packets) this.add(`${deviceId} ${writeChars[0]} ← ${hex(p)}`);
  }

  stateOf(deviceId: string) { return this.states.get(deviceId) ?? 'disconnected'; }

  onState(listener: (id: string, s: LinkState, d?: string) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  onLog(listener: () => void) {
    this.logListeners.add(listener);
    return () => { this.logListeners.delete(listener); };
  }

  private add(text: string) {
    this.log.unshift({ at: Date.now(), text });
    this.log.splice(80);
    this.logListeners.forEach((l) => l());
  }

  private emit(id: string, s: LinkState) {
    this.states.set(id, s);
    this.listeners.forEach((l) => l(id, s));
  }
}
