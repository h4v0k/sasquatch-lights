import * as Location from 'expo-location';
import { useEffect } from 'react';
import { useStore } from '../store';
import { stateCode } from './latch';

const GEOCODE_EVERY_MS = 10 * 60_000;

/** Feeds GPS speed into the driving latch and keeps the state (region) current. */
export function useRoadLock() {
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let lastGeo = 0;
    let cancelled = false;
    const { speedSample, setGps, setRegion } = useStore.getState();

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== 'granted') {
          setGps('denied');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          setGps('unavailable');
        }
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 0 },
          async (pos) => {
            setGps('ok');
            speedSample(pos.coords.speed, pos.timestamp || Date.now());
            if (Date.now() - lastGeo > GEOCODE_EVERY_MS) {
              lastGeo = Date.now();
              try {
                const [place] = await Location.reverseGeocodeAsync(pos.coords);
                setRegion(stateCode(place?.region, place?.isoCountryCode));
              } catch {
                // keep the last region; unknown falls back to the strictest rules
              }
            }
          },
        );
      } catch {
        setGps('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);
}
