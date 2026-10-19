import { useEffect, useRef } from 'react';
import { isDriving, selectEffective, useStore } from '../store';
import type { LightTransport } from '../transport/types';
import { diffJobs, jobsFor } from './packets';

const RESEND_WHILE_DRIVING_MS = 10_000;

/**
 * Sends the effective mode to every assigned controller whenever it changes (debounced, only what changed).
 * One send queue per controller, so a slow box can't hold up the others. A controller that reconnects
 * gets its full state again, and while driving everything is resent every 10 s in case a box missed it.
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
                last.current.delete(j.deviceId); // resend on the next change or resend tick
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
    const resend = setInterval(() => {
      if (isDriving(useStore.getState())) {
        last.current.clear();
        push();
      }
    }, RESEND_WHILE_DRIVING_MS);
    return () => {
      unsub();
      offState();
      clearInterval(resend);
      if (timer) clearTimeout(timer);
    };
  }, [transport]);
}
