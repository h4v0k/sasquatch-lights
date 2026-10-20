import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from '../store';
import { stateCode } from './region';

const EVERY_MS = 10 * 60_000;
const TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

/**
 * Finds which state the phone is in, so the Road lock can use that state's rules. Foreground only,
 * one fix every 10 minutes and on return to the app. No location means no rule set: fail open.
 */
export function useRegion() {
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let asked = false;
    const st = useStore.getState;

    const check = async () => {
      if (busy || cancelled || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        let granted = perm.status === 'granted';
        if (!granted && perm.canAskAgain && !asked) {
          asked = true; // ask once per launch, not every 10 minutes
          granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
        }
        if (cancelled) return;
        if (!granted) {
          st().setRegion(null); // fail open
          st().setLocation('denied');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          st().setRegion(null);
          st().setLocation('unavailable');
          return;
        }
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })));
        // The phone's geocoder (Google on Android, Apple on iPhone) gets these coordinates; only the state is kept.
        const [place] = await withTimeout(Location.reverseGeocodeAsync(pos.coords));
        if (cancelled) return;
        st().setRegion(stateCode(place?.region, place?.isoCountryCode));
        st().setLocation('ok');
      } catch {
        if (!cancelled) {
          st().setRegion(null); // no lookup: fail open
          st().setLocation('unavailable');
        }
      } finally {
        busy = false;
      }
    };

    check();
    const timer = setInterval(check, EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
    };
  }, []);
}
