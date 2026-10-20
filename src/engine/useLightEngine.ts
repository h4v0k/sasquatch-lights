import { useEffect, useRef } from 'react';
import { selectEffective, useStore } from '../store';
import type { LightTransport } from '../transport/types';
import { diffJobs, jobsFor } from './packets';

/**
 * Sends the effective mode to every assigned controller whenever it changes (debounced, only what changed).
 * One send queue per controller, so a slow box can't hold up the others. A controller that reconnects
 * gets its full state again.
 */
export function useLightEngine(transport: LightTransport) {
  const last = useRef(new Map<string, string>());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const chains = new Map<string, Promise<void>>();
    const push = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useStore.getState();
        const jobs = diffJobs(jobsFor(selectEffective(s), s.devices), last.current);
        for (const j of jobs) {
          const prev = chains.get(j.deviceId) ?? Promise.resolve();
          chains.set(
            j.deviceId,
            prev
              .then(() => transport.send(j.deviceId, j.driver.write, j.packets, j.driver.writeGapMs))
              .catch(() => {
                last.current.delete(j.deviceId); // resend on the next change
              }),
          );
        }
      }, 120);
    };
    push();
    const unsub = useStore.subscribe(push);
    const offState = transport.onState((id, state) => {
      if (state === 'connected') {
        last.current.delete(id);
        push();
      }
    });
    return () => {
      unsub();
      offState();
      if (timer) clearTimeout(timer);
    };
  }, [transport]);
}
