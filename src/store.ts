import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Assigned } from './engine/packets';
import { clampToRules, editZone, effectiveMode, modeMeetsRoadLock, ROAD_ID, SEED_MODES, ZONES, type Mode, type Zone } from './model/modes';
import { initialLatch, stepLatch, type LatchState } from './roadlock/latch';
import { rulesFor, type ZoneId } from './rules';

export type GpsStatus = 'starting' | 'ok' | 'denied' | 'unavailable';

type State = {
  // persisted
  modes: Mode[];
  activeId: string;
  sync: boolean;
  devices: Assigned[];
  // live
  latch: LatchState;
  gps: GpsStatus;
  regionCode: string | null;
  /** Demo only: forces the road lock on. It can never force it off. */
  simulateDriving: boolean;
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
  speedSample(speed: number | null, now: number): void;
  setGps(s: GpsStatus): void;
  setRegion(code: string | null): void;
  setSimulateDriving(on: boolean): void;
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      modes: SEED_MODES,
      activeId: 'show',
      sync: true,
      devices: [],
      latch: initialLatch,
      gps: 'starting',
      regionCode: null,
      simulateDriving: false,

      setActive(id) {
        const s = get();
        const m = s.modes.find((x) => x.id === id);
        if (!m) return;
        if (isDriving(s) && !modeMeetsRoadLock(m, rulesFor(s.regionCode))) return;
        set({ activeId: id });
      },

      editActiveZone(zone, patch) {
        const s = get();
        if (isDriving(s)) return; // editing locks while driving
        const rules = rulesFor(s.regionCode);
        set({
          modes: s.modes.map((m) => {
            if (m.id !== s.activeId) return m;
            const isRoad = m.id === ROAD_ID;
            const next = editZone(m, zone, patch, s.sync && !isRoad);
            return isRoad ? clampToRules(next, rules) : next;
          }),
        });
      },

      allOff() {
        const s = get();
        if (isDriving(s)) return;
        set({
          modes: s.modes.map((m) => {
            if (m.id !== s.activeId) return m;
            const zones = { ...m.zones };
            for (const k of ZONES) zones[k] = { ...zones[k], on: false };
            return { ...m, zones };
          }),
        });
      },

      setSync(on) {
        set({ sync: on });
      },

      saveMode(m) {
        const s = get();
        if (isDriving(s)) return s.activeId;
        const exists = s.modes.some((x) => x.id === m.id);
        const id = exists ? m.id : `m${Date.now()}`;
        const name = m.name.trim() || 'My mode';
        const saved = { ...m, id, name, builtin: exists ? s.modes.find((x) => x.id === m.id)?.builtin : false };
        set({ modes: exists ? s.modes.map((x) => (x.id === id ? saved : x)) : [...s.modes, saved], activeId: id });
        return id;
      },

      deleteMode(id) {
        const s = get();
        const m = s.modes.find((x) => x.id === id);
        if (!m || m.builtin) return;
        set({ modes: s.modes.filter((x) => x.id !== id), activeId: s.activeId === id ? 'show' : s.activeId });
      },

      assignDevice(a) {
        set({ devices: [...get().devices.filter((d) => d.deviceId !== a.deviceId), a] });
      },
      unassignDevice(deviceId) {
        set({ devices: get().devices.filter((d) => d.deviceId !== deviceId) });
      },
      setDriver(deviceId, driverId) {
        set({ devices: get().devices.map((d) => (d.deviceId === deviceId ? { ...d, driverId } : d)) });
      },

      speedSample(speed, now) {
        set({ latch: stepLatch(get().latch, speed, now) });
      },
      setGps(gps) {
        set({ gps });
      },
      setRegion(regionCode) {
        set({ regionCode });
      },
      setSimulateDriving(simulateDriving) {
        set({ simulateDriving });
      },
    }),
    {
      name: 'sasquatch-lights',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ modes: s.modes, activeId: s.activeId, sync: s.sync, devices: s.devices }),
    },
  ),
);

/** Fail safe: no location permission or no GPS means the lock stays on. */
export function isDriving(s: Pick<State, 'latch' | 'gps' | 'simulateDriving'>): boolean {
  return s.simulateDriving || s.latch.driving || s.gps === 'denied' || s.gps === 'unavailable';
}

export function selectEffective(s: State): Mode {
  return effectiveMode(s.modes, s.activeId, isDriving(s), rulesFor(s.regionCode));
}
