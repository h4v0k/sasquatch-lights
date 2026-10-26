import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from '../store';
import { MPS_TO_MPH, newTracker, onReading, onTick, type MotionTracker } from './motion';

/**
 * Watches GPS speed while the app is open, for the Auto Road lock (on over 15 mph, off after 2 minutes
 * parked). Foreground only: with the app closed or the screen off nothing changes, and the lights keep
 * whatever they last showed. Never asks for permission itself; useRegion does that once per launch.
 */
export function useMotion() {
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let starting = false;
    let cancelled = false;
    let t: MotionTracker = newTracker();
    const st = useStore.getState;

    const publish = (mph: number | null) =>
      st().setMotion({ moving: t.moving, mph, source: t.lastFix !== null ? 'gps' : 'none' });

    const start = async () => {
      if (sub || starting || cancelled || AppState.currentState !== 'active') return;
      starting = true;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted' || !(await Location.hasServicesEnabledAsync())) return;
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 0 },
          (pos) => {
            const v = pos.coords.speed;
            const mph = v === null || v === undefined || v < 0 ? null : v * MPS_TO_MPH;
            t = onReading(t, mph, Date.now());
            publish(mph === null ? null : Math.round(mph));
          },
        );
        if (cancelled) s.remove();
        else sub = s;
      } catch {
        // No GPS: Auto treats the car as parked (see lockActive).
      } finally {
        starting = false;
      }
    };

    const stop = () => {
      sub?.remove();
      sub = null;
    };

    start();
    const retry = setInterval(() => {
      if (!sub) start(); // permission may be granted a moment after launch
      const before = t.moving;
      t = onTick(t, Date.now());
      if (t.moving !== before) publish(null);
    }, 15_000);
    const appSub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      cancelled = true;
      clearInterval(retry);
      appSub.remove();
      stop();
    };
  }, []);
}
