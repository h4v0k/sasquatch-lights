import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Assigned } from './engine/packets';
import { clampToRules, editZone, effectiveMode, modeMeetsRoadLock, SEED_MODES, ZONES, type Mode, type Zone } from './model/modes';
import { rulesFor, type ZoneId } from './rules';

/** Location is only used to know which state you're in. */
export type LocationStatus = 'starting' | 'ok' | 'denied' | 'unavailable';

type State = {
  // persisted
  modes: Mode[];
  activeId: string;
  sync: boolean;
  devices: Assigned[];
  /** The user's Road lock switch. On: the state's rules apply (when there is a rule set). */
  roadLock: boolean;
  // live
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
  setRoadLock(on: boolean): void;
  setRegion(code: string | null): void;
  setLocation(s: LocationStatus): void;
};

/** The rules in force right now: none when the Road lock is off or the state has no rule set. */
export function activeRules(s: Pick<State, 'roadLock' | 'regionCode'>) {
  return s.roadLock ? rulesFor(s.regionCode) : null;
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      modes: SEED_MODES,
      activeId: 'show',
      sync: true,
      devices: [],
      roadLock: true,
      regionCode: null,
      location: 'starting',

      setActive(id) {
        const s = get();
        const m = s.modes.find((x) => x.id === id);
        if (!m) return;
        if (!modeMeetsRoadLock(m, activeRules(s))) return; // pick it after turning the Road lock off
        set({ activeId: id });
      },

      editActiveZone(zone, patch) {
        const s = get();
        const rules = activeRules(s);
        // Edit what is actually showing (Road when the active mode is paused by the lock).
        const target = selectEffective(s).id;
        set({
          modes: s.modes.map((m) => {
            if (m.id !== target) return m;
            const next = editZone(m, zone, patch, s.sync && !rules);
            return clampToRules(next, rules);
          }),
        });
      },

      allOff() {
        const s = get();
        const target = selectEffective(s).id;
        set({
          modes: s.modes.map((m) => {
            if (m.id !== target) return m;
            const zones = { ...m.zones };
            for (const k of ZONES) zones[k] = { ...zones[k], on: false };
            return clampToRules({ ...m, zones }, activeRules(s)); // head and tail stay on under the lock
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
        set({ modes, activeId: modeMeetsRoadLock(saved, activeRules(s)) ? id : s.activeId });
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

      setRoadLock(roadLock) {
        set({ roadLock });
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ modes: s.modes, activeId: s.activeId, sync: s.sync, devices: s.devices, roadLock: s.roadLock }),
      migrate: (persisted) => ({ roadLock: true, ...(persisted as object) }) as never,
    },
  ),
);

export function selectEffective(s: Pick<State, 'modes' | 'activeId' | 'roadLock' | 'regionCode'>): Mode {
  return effectiveMode(s.modes, s.activeId, s.roadLock, rulesFor(s.regionCode));
}
