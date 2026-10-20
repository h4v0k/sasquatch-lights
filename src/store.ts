import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Assigned } from './engine/packets';
import { clampToRules, editZone, effectiveMode, modeMeetsRoadLock, ROAD_ID, SEED_MODES, ZONES, type Mode, type Zone } from './model/modes';
import { initialLatch, stepLatch, type LatchState } from './roadlock/latch';
import { rulesFor, type ZoneId } from './rules';

import { FIX_STALE_MS, isDriving, type GpsStatus } from './roadlock/lock';

export { isDriving, FIX_STALE_MS, type GpsStatus };

type State = {
  // persisted
  modes: Mode[];
  activeId: string;
  sync: boolean;
  devices: Assigned[];
  // live
  latch: LatchState;
  gps: GpsStatus;
  lastFixAt: number;
  lastSpeed: number | null;
  /** True when location keeps updating with the screen off (Android foreground service). */
  background: boolean;
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
  /** Called every few seconds: ages the stop timer and marks GPS stale. */
  tick(now: number): void;
  setBackground(on: boolean): void;
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
      lastFixAt: 0,
      lastSpeed: null,
      background: false,
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
        if (isDriving(get())) return;
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
        if (!m || m.builtin || isDriving(s)) return;
        set({ modes: s.modes.filter((x) => x.id !== id), activeId: s.activeId === id ? 'show' : s.activeId });
      },

      // Controller changes are locked while driving: the rules key on zone, so moving a controller
      // to another zone mid-drive could put a forbidden color on a light.
      assignDevice(a) {
        if (isDriving(get())) return;
        set({ devices: [...get().devices.filter((d) => d.deviceId !== a.deviceId), a] });
      },
      unassignDevice(deviceId) {
        if (isDriving(get())) return;
        set({ devices: get().devices.filter((d) => d.deviceId !== deviceId) });
      },
      setDriver(deviceId, driverId) {
        if (isDriving(get())) return;
        set({ devices: get().devices.map((d) => (d.deviceId === deviceId ? { ...d, driverId } : d)) });
      },

      speedSample(speed, now) {
        // Only a fix with a real speed counts as GPS being ok; a position without speed keeps the lock on.
        if (speed == null || !Number.isFinite(speed) || speed < 0) return;
        set({ latch: stepLatch(get().latch, speed, now), gps: 'ok', lastFixAt: Math.max(get().lastFixAt, now), lastSpeed: speed });
      },
      tick(now) {
        const s = get();
        if (s.gps === 'ok' && now - s.lastFixAt > FIX_STALE_MS) {
          // Restart the stop timer after a gap, so an old stop can't release the lock on the first new fix.
          set({ gps: 'stale', latch: { ...s.latch, stoppedSince: null } });
          return;
        }
        // Without new samples the stop timer would never finish; replay the last known speed.
        if (s.gps === 'ok' && s.lastSpeed != null) set({ latch: stepLatch(s.latch, s.lastSpeed, now) });
      },
      setBackground(background) {
        set({ background });
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


export function selectEffective(s: State): Mode {
  return effectiveMode(s.modes, s.activeId, isDriving(s), rulesFor(s.regionCode));
}
