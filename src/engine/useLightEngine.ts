import { useEffect, useRef } from 'react';
import { selectEffective, useStore } from '../store';
import type { LightTransport } from '../transport/types';
import { diffJobs, jobsFor } from './packets';

/** Sends the effective mode to every assigned controller whenever it changes (debounced, only what changed). */
export function useLightEngine(transport: LightTransport) {
  const last = useRef(new Map<string, string>());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let chain = Promise.resolve();
    const push = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useStore.getState();
        const jobs = diffJobs(jobsFor(selectEffective(s), s.devices), last.current);
        for (const j of jobs) {
          chain = chain
            .then(() => transport.send(j.deviceId, j.driver.write, j.packets, j.driver.writeGapMs))
            .catch(() => {
              last.current.delete(j.deviceId); // retry on the next change
            });
        }
      }, 120);
    };
    push();
    const unsub = useStore.subscribe(push);
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [transport]);
}
