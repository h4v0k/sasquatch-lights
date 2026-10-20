import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { FIX_STALE_MS, useStore } from '../store';
import { stateCode, trustedSpeed, type Fix } from './latch';

const TASK = 'sasquatch-road-lock';
const GEOCODE_EVERY_MS = 10 * 60_000;
const TICK_MS = 5_000;
const KEEP_AWAKE_TAG = 'road-lock';

const GEOCODE_RETRY_MS = 30_000;
let nextGeo = 0;

function releaseKeepAwake() {
  Promise.resolve()
    .then(() => deactivateKeepAwake(KEEP_AWAKE_TAG))
    .catch(() => {});
}
let prev: Fix | null = null;

function geocode(coords: Location.LocationObjectCoords, now: number) {
  if (now < nextGeo) return;
  nextGeo = now + GEOCODE_RETRY_MS;
  // Platform geocoder (Google on Android). Only the state is kept, in memory. Not awaited, so a slow
  // lookup never delays speed updates.
  Location.reverseGeocodeAsync(coords)
    .then(([place]) => {
      useStore.getState().setRegion(stateCode(place?.region, place?.isoCountryCode));
      nextGeo = Date.now() + GEOCODE_EVERY_MS;
    })
    .catch(() => {
      // keep the last region and retry soon; unknown falls back to the strictest rules
    });
}

function onFix(pos: Location.LocationObject) {
  const now = Date.now();
  const t = pos.timestamp || now;
  if (now - t > FIX_STALE_MS) return; // cached or old fix
  if (prev && t <= prev.t) return; // out of order
  const cur: Fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, t, speed: pos.coords.speed, accuracy: pos.coords.accuracy };
  const speed = trustedSpeed(prev, cur);
  prev = cur;
  useStore.getState().speedSample(speed, t);
  geocode(pos.coords, now);
}

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error) return;
  const locs = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  for (const l of locs) onFix(l);
});

/** Feeds GPS speed into the driving latch. Anything short of a recent fix keeps the lock on. */
export function useRoadLock() {
  useEffect(() => {
    let cancelled = false;
    let fgSub: Location.LocationSubscription | null = null;
    const st = useStore.getState;

    const tick = setInterval(async () => {
      st().tick(Date.now());
      try {
        if (!(await Location.hasServicesEnabledAsync())) st().setGps('unavailable');
      } catch {
        // ignore
      }
    }, TICK_MS);

    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') st().tick(Date.now());
    });

    (async () => {
      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (fg.status !== 'granted') {
          st().setGps('denied');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) st().setGps('unavailable');

        // Background tracking ("Allow all the time") keeps the lock working with the screen off.
        let bg = false;
        if (Platform.OS === 'android') {
          try {
            bg = (await Location.requestBackgroundPermissionsAsync()).status === 'granted';
          } catch {
            bg = false;
          }
        }
        if (cancelled) return;

        if (bg) {
          try {
            await Location.startLocationUpdatesAsync(TASK, {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 0,
              foregroundService: {
                notificationTitle: 'Road lock on watch',
                notificationBody: 'Sasquatch Lights is checking your speed to apply the Road lock.',
                notificationColor: '#D9944E',
              },
              pausesUpdatesAutomatically: false,
            });
            st().setBackground(true);
            releaseKeepAwake();
          } catch {
            bg = false; // the foreground service was refused: fall back to foreground tracking
          }
        }
        if (!bg) {
          // No background location: keep the screen on while the app is open so tracking doesn't stop.
          st().setBackground(false);
          try {
            if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
          } catch {
            // nothing running
          }
          activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
          const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 },
            (pos) => {
              onFix(pos);
            },
          );
          if (cancelled) sub.remove();
          else fgSub = sub;
        }
      } catch {
        st().setGps('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
      appSub.remove();
      fgSub?.remove();
      releaseKeepAwake();
      // The background task keeps running so the lock state stays current with the screen off.
      // Lights are only updated while the app process is alive (the foreground service keeps it alive).
    };
  }, []);
}
