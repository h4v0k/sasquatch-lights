import type { Bytes } from '../protocol';

/**
 * How the app talks to controllers. The UI and the light engine only use this interface,
 * so screens don't care whether it's real Bluetooth or the demo.
 */
export type FoundDevice = { id: string; name: string | null; rssi: number | null };

export type LinkState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type LogLine = { at: number; text: string };

export interface LightTransport {
  /** Short label shown on the Devices screen. */
  readonly kind: 'demo' | 'ble';
  /** Recent activity, newest first. */
  readonly log: LogLine[];
  onLog(listener: () => void): () => void;
  /** Starts a scan; calls onFound for each device. Returns a stop function. Rejects-by-callback via onError. */
  scan(onFound: (d: FoundDevice) => void, onError?: (message: string) => void): () => void;
  /** Connects and keeps the link open, reconnecting on drops until disconnect() is called. */
  connect(deviceId: string, services: string[]): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  /** Writes packets in order to the first of `writeChars` the device has, waiting gapMs between writes. */
  send(deviceId: string, writeChars: string[], packets: Bytes[], gapMs: number): Promise<void>;
  stateOf(deviceId: string): LinkState;
  onState(listener: (deviceId: string, state: LinkState, detail?: string) => void): () => void;
}
