import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from '../store';
import { stateCode } from './region';

const EVERY_MS = 10 * 60_000;

/**
 * Finds which state the phone is in, so the Road lock can use that state's rules. Foreground only,
 * one fix every 10 minutes and on return to the app. No location means no rule set: fail open.
 */
export function useRegion() {
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const st = useStore.getState;

    const check = async () => {
      if (busy || cancelled) return;
      busy = true;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        const granted = perm.status === 'granted' || (perm.canAskAgain && (await Location.requestForegroundPermissionsAsync()).status === 'granted');
        if (cancelled) return;
        if (!granted) {
          st().setLocation('denied');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          st().setLocation('unavailable');
          return;
        }
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: EVERY_MS })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        // Platform geocoder (Google on Android). Only the state is kept, in memory.
        const [place] = await Location.reverseGeocodeAsync(pos.coords);
        if (cancelled) return;
        st().setRegion(stateCode(place?.region, place?.isoCountryCode));
        st().setLocation('ok');
      } catch {
        if (!cancelled) st().setLocation('unavailable'); // keep the last known state
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
