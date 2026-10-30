import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ENGAGE_MPH } from '../roadlock/motion';
import { lockActive, useStore, type LockMode } from '../store';
import { Icon, type IconName } from './parts';
import { C, S, T } from './theme';

type St = ReturnType<typeof useStore.getState>;

export const LOCK_OPTIONS: { id: LockMode; label: string; icon: IconName; desc: string }[] = [
  { id: 'auto', label: 'Auto', icon: 'speedometer-outline', desc: `Locks to road-legal colors when you're driving over ${ENGAGE_MPH} mph. Unlocks after 2 minutes parked.` },
  { id: 'on', label: 'Always on', icon: 'lock-closed-outline', desc: 'Road-legal colors all the time, even parked.' },
  { id: 'parade', label: 'Parade', icon: 'flag-outline', desc: 'Stays unlocked while moving, for cruises and parades. Goes back to Auto next time the app opens.' },
];

/** Short headline + one line for the home screen card. */
export function lockSummary(s: St): { title: string; line: string; on: boolean } {
  const on = lockActive(s);
  const speed = s.motion.mph !== null && s.motion.mph > 0 ? ` · ${s.motion.mph} mph` : '';
  const mode = LOCK_OPTIONS.find((o) => o.id === s.lockMode)!.label;
  const title = `Road lock: ${on ? 'locked' : 'unlocked'}`;
  if (s.lockMode === 'auto' && s.location === 'denied') return { title, line: `${mode} · location is off, so it stays locked`, on };
  if (on) return { title, line: `${mode}${speed} · white headlights, red taillights, no red or blue`, on };
  return { title, line: `${mode}${speed} · any color (no red or blue up front)`, on };
}

/** Auto / Always on / Parade as three explained options. */
export function LockOptions() {
  const s = useStore();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: S.sm }}>
      {LOCK_OPTIONS.map((o) => {
        const sel = s.lockMode === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => s.setLockMode(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={`${o.label}. ${o.desc}`}
            style={[T.card, { flexDirection: 'row', gap: S.md, padding: S.lg, alignItems: 'flex-start', borderColor: sel ? C.accent : C.line, borderWidth: sel ? 2 : 1 }]}
          >
            <Icon name={o.icon} color={sel ? C.accent : C.muted} size={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={T.strong}>{o.label}</Text>
              <Text style={T.sub}>{o.desc}</Text>
            </View>
            <Icon name={sel ? 'radio-button-on' : 'radio-button-off'} color={sel ? C.accent : C.line2} size={24} />
          </Pressable>
        );
      })}
    </View>
  );
}
