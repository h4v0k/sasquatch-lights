import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { FIX_STALE_MS, useStore } from '../store';
import { stateCode } from './latch';

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
let prev: { lat: number; lon: number; t: number } | null = null;

/** Meters between two coordinates (haversine). */
function meters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function onFix(pos: Location.LocationObject) {
  const { speedSample, setRegion } = useStore.getState();
  const now = Date.now();
  const t = pos.timestamp || now;
  if (now - t > FIX_STALE_MS) return; // cached or old fix: ignore
  const here = { lat: pos.coords.latitude, lon: pos.coords.longitude, t };
  let speed = pos.coords.speed;
  if ((speed == null || speed < 0) && prev && t - prev.t >= 1000 && t - prev.t <= 30_000) {
    speed = meters(prev, here) / ((t - prev.t) / 1000); // no reported speed: derive it from movement
  }
  prev = here;
  speedSample(speed, t);
  if (now >= nextGeo) {
    nextGeo = now + GEOCODE_RETRY_MS;
    try {
      // Platform geocoder (Google on Android). Only the state is kept, in memory.
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      setRegion(stateCode(place?.region, place?.isoCountryCode));
      nextGeo = now + GEOCODE_EVERY_MS;
    } catch {
      // keep the last region and retry soon; unknown falls back to the strictest rules
    }
  }
}

// Background updates run here (Android foreground service keeps the app alive with the screen off).
// Must be defined at module load, so this file is imported from index.ts.
TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error) return;
  const locs = (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  for (const l of locs) await onFix(l);
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
