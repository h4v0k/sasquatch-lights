import type { Bytes } from '../protocol';
import type { FoundDevice, LightTransport, LinkState } from './types';

/** Stand-in until the Bluetooth layer exists: pretends to connect and records every packet. */
export type SentPacket = { at: number; deviceId: string; char: string; hex: string };

const hex = (b: Bytes) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');

export class DemoTransport implements LightTransport {
  readonly kind = 'demo' as const;
  readonly log: SentPacket[] = [];
  private listeners = new Set<(id: string, s: LinkState, d?: string) => void>();
  private logListeners = new Set<() => void>();

  scan(onFound: (d: FoundDevice) => void) {
    const t = setTimeout(() => {
      onFound({ id: 'demo-elk-1', name: 'ELK-BLEDOM', rssi: -58 });
      onFound({ id: 'demo-triones-1', name: 'Triones-A1B2', rssi: -64 });
    }, 400);
    return () => clearTimeout(t);
  }

  async connect(deviceId: string) {
    this.emit(deviceId, 'connected');
  }

  async disconnect(deviceId: string) {
    this.emit(deviceId, 'disconnected');
  }

  async send(deviceId: string, writeChars: string[], packets: Bytes[]) {
    for (const p of packets) {
      this.log.unshift({ at: Date.now(), deviceId, char: writeChars[0], hex: hex(p) });
    }
    this.log.splice(60);
    this.logListeners.forEach((l) => l());
  }

  onState(listener: (id: string, s: LinkState, d?: string) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onLog(listener: () => void) {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  private emit(id: string, s: LinkState) {
    this.listeners.forEach((l) => l(id, s));
  }
}
