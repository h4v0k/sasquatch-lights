import type { Bytes } from '../protocol';

/**
 * How the app talks to controllers. The UI and the light engine only use this interface,
 * so the real Bluetooth implementation (after Wednesday's capture) drops in without touching screens.
 */
export type FoundDevice = { id: string; name: string | null; rssi: number | null };

export type LinkState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LightTransport {
  /** Short label shown on the Devices screen. */
  readonly kind: 'demo' | 'ble';
  /** Starts a scan; calls onFound for each device. Returns a stop function. */
  scan(onFound: (d: FoundDevice) => void): () => void;
  /** Connects (or reconnects) and keeps the link open. */
  connect(deviceId: string, services: string[]): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  /** Writes packets in order to the first of `writeChars` the device has, waiting gapMs between writes. */
  send(deviceId: string, writeChars: string[], packets: Bytes[], gapMs: number): Promise<void>;
  onState(listener: (deviceId: string, state: LinkState, detail?: string) => void): () => void;
}
