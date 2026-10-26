import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Assigned } from './engine/packets';
import { editZone, effectiveMode, matchAll, SEED_MODES, ZONES, type Mode, type Zone } from './model/modes';
import type { Rgb } from './model/colors';
import { knownFor } from './model/known';
import { rulesFor, type ColorId, type ZoneId } from './rules';

import { lockActive, type LocationStatus, type LockMode, type Motion } from './roadlock/lock';
export { lockActive, type LocationStatus, type LockMode, type Motion };

type State = {
  // persisted
  modes: Mode[];
  activeId: string;
  sync: boolean;
  devices: Assigned[];
  /** Known controllers the user removed on purpose, so auto-assign leaves them alone. */
  skippedKnown: string[];
  /** Pairing locked: the app only reconnects to the saved controllers and never scans for new ones. */
  lightsLocked: boolean;
  lockMode: LockMode;
  // live
  motion: Motion;
  regionCode: string | null;
  location: LocationStatus;
};

type Actions = {
  setActive(id: string): void;
  editActiveZone(zone: ZoneId, patch: Partial<Zone>): void;
  allOff(): void;
  setSync(on: boolean): void;
  saveMode(m: Mode): string;
  deleteMode(id: string): void;
  assignDevice(a: Assigned): void;
  unassignDevice(deviceId: string): void;
  setDriver(deviceId: string, driverId: string): void;
  setLightsLocked(on: boolean): void;
  setLockMode(m: LockMode): void;
  setMotion(m: Motion): void;
  matchAllLights(color: ColorId, custom: Rgb): void;
  setRegion(code: string | null): void;
  setLocation(s: LocationStatus): void;
};

/** The rules in force right now: null when the Road lock isn't active; the baseline when the state has no rule set. */
export function activeRules(s: Pick<State, 'lockMode' | 'motion' | 'location' | 'regionCode'>) {
  return lockActive(s) ? rulesFor(s.regionCode) : null;
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      modes: SEED_MODES,
      activeId: 'show',
      sync: true,
      devices: [],
      skippedKnown: [],
      lightsLocked: false,
      lockMode: 'auto',
      motion: { moving: false, mph: null, source: 'none' },
      regionCode: null,
      location: 'starting',

      setActive(id) {
        const s = get();
        const m = s.modes.find((x) => x.id === id);
        if (!m) return;
        set({ activeId: id });
      },

      editActiveZone(zone, patch) {
        const s = get();
        const rules = activeRules(s);
        const target = s.activeId;
        set({
          modes: s.modes.map((m) => {
            if (m.id !== target) return m;
            const next = editZone(m, zone, patch, s.sync && !rules);
            return next; // saved as picked; what shows is snapped by effectiveMode while the lock is on
          }),
        });
      },

      allOff() {
        const s = get();
        const target = s.activeId;
        set({
          modes: s.modes.map((m) => {
            if (m.id !== target) return m;
            const zones = { ...m.zones };
            for (const k of ZONES) zones[k] = { ...zones[k], on: false };
            return { ...m, zones }; // head and tail still show under the lock (effectiveMode)
          }),
        });
      },

      setSync(on) {
        set({ sync: on });
      },

      saveMode(m) {
        const s = get();
        const exists = s.modes.some((x) => x.id === m.id);
        const id = exists ? m.id : `m${Date.now()}`;
        const name = m.name.trim() || 'My mode';
        const saved = { ...m, id, name, builtin: exists ? s.modes.find((x) => x.id === m.id)?.builtin : false };
        const modes = exists ? s.modes.map((x) => (x.id === id ? saved : x)) : [...s.modes, saved];
        // Only switch to it if it can run right now.
        set({ modes, activeId: id });
        return id;
      },

      deleteMode(id) {
        const s = get();
        const m = s.modes.find((x) => x.id === id);
        if (!m || m.builtin) return;
        set({ modes: s.modes.filter((x) => x.id !== id), activeId: s.activeId === id ? 'show' : s.activeId });
      },

      assignDevice(a) {
        const s = get();
        set({
          devices: [...s.devices.filter((d) => d.deviceId !== a.deviceId), a],
          skippedKnown: s.skippedKnown.filter((n) => n !== (a.name ?? '').trim()),
        });
      },
      unassignDevice(deviceId) {
        const s = get();
        const gone = s.devices.find((d) => d.deviceId === deviceId);
        const name = (gone?.name ?? '').trim();
        set({
          devices: s.devices.filter((d) => d.deviceId !== deviceId),
          skippedKnown: knownFor(name) && !s.skippedKnown.includes(name) ? [...s.skippedKnown, name] : s.skippedKnown,
        });
      },
      setDriver(deviceId, driverId) {
        set({ devices: get().devices.map((d) => (d.deviceId === deviceId ? { ...d, driverId } : d)) });
      },

      setLightsLocked(lightsLocked) {
        set({ lightsLocked });
      },
      setLockMode(lockMode) {
        set({ lockMode });
      },
      setMotion(motion) {
        const m = get().motion;
        if (m.moving === motion.moving && m.mph === motion.mph && m.source === motion.source) return;
        set({ motion });
      },
      matchAllLights(color, custom) {
        const s = get();
        set({ modes: s.modes.map((m) => (m.id === s.activeId ? matchAll(m, color, custom) : m)) });
      },
      setRegion(regionCode) {
        set({ regionCode });
      },
      setLocation(location) {
        set({ location });
      },
    }),
    {
      name: 'sasquatch-lights',
      version: 5,
      storage: createJSONStorage(() => AsyncStorage),
      // Parade is never saved: a relaunch always comes back in Auto.
      partialize: (s) => ({ modes: s.modes, activeId: s.activeId, sync: s.sync, devices: s.devices, skippedKnown: s.skippedKnown, lightsLocked: s.lightsLocked, lockMode: s.lockMode === 'parade' ? 'auto' : s.lockMode }),
      migrate: (persisted) => {
        const { roadLock: _old, ...rest } = (persisted ?? {}) as { roadLock?: boolean } & Record<string, unknown>;
        return { skippedKnown: [], lightsLocked: false, lockMode: 'auto', ...rest } as never;
      },
    },
  ),
);

export function selectEffective(s: Pick<State, 'modes' | 'activeId' | 'lockMode' | 'motion' | 'location' | 'regionCode'>): Mode {
  return effectiveMode(s.modes, s.activeId, lockActive(s), rulesFor(s.regionCode));
}
