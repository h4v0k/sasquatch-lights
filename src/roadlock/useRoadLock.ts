import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useStore } from '../store';
import { stateCode } from './latch';

const TASK = 'sasquatch-road-lock';
const GEOCODE_EVERY_MS = 10 * 60_000;
const TICK_MS = 5_000;
const KEEP_AWAKE_TAG = 'road-lock';

let lastGeo = 0;

async function onFix(pos: Location.LocationObject) {
  const { speedSample, setRegion } = useStore.getState();
  speedSample(pos.coords.speed, pos.timestamp || Date.now());
  if (Date.now() - lastGeo > GEOCODE_EVERY_MS) {
    lastGeo = Date.now();
    try {
      // Platform geocoder (Google on Android). Only the state is kept, in memory.
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      setRegion(stateCode(place?.region, place?.isoCountryCode));
    } catch {
      // keep the last region; unknown falls back to the strictest rules
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
          await Location.startLocationUpdatesAsync(TASK, {
            accuracy: Location.Accuracy.Balanced,
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
          deactivateKeepAwake(KEEP_AWAKE_TAG);
        } else {
          // No background location: keep the screen on while the app is open so tracking doesn't stop.
          st().setBackground(false);
          activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
          const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 0 },
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
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      // The background task keeps running on purpose: the lock should hold while the app is closed.
    };
  }, []);
}
