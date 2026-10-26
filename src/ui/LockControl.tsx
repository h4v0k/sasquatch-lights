import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ENGAGE_MPH } from '../roadlock/motion';
import { hasRuleSet, rulesFor } from '../rules';
import { lockActive, useStore, type LockMode } from '../store';
import { C, T } from './theme';

const OPTIONS: { id: LockMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'on', label: 'On' },
  { id: 'parade', label: 'Parade' },
];

/** One line on what the Road lock is doing right now and why. */
export function lockStatus(s: ReturnType<typeof useStore.getState>): string {
  const on = lockActive(s);
  const where = hasRuleSet(s.regionCode) ? `${rulesFor(s.regionCode).region} rules` : 'default rules';
  const speed = s.motion.mph !== null ? ` · ${s.motion.mph} mph` : '';
  if (s.lockMode === 'parade') return `Parade: lock off even while moving${speed}. Any color except red or blue up front. Turns back to Auto next launch.`;
  if (s.lockMode === 'on') return `On: headlights white, taillights red, no red or blue anywhere (${where}).`;
  if (s.location === 'denied') return 'Auto, but location is off for this app, so it can\'t see speed: the lock stays on.';
  if (s.motion.source === 'none') return `Auto: no GPS speed yet, treating the car as parked. Locks over ${ENGAGE_MPH} mph.`;
  if (on) return `Auto: moving${speed}. Headlights white, taillights red, no red or blue. Unlocks after 2 minutes parked.`;
  return `Auto: parked${speed}. Any color except red or blue up front. Locks over ${ENGAGE_MPH} mph.`;
}

/** Auto / On / Parade picker for the Road lock, with its status line. */
export function LockControl() {
  const s = useStore();
  const on = lockActive(s);
  return (
    <View style={[T.card, { padding: 12, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Text style={T.strong}>Road lock</Text>
        <Text style={{ color: on ? C.okText : C.warnText, fontSize: 16, fontWeight: '700' }}>{on ? 'Locked' : 'Unlocked'}</Text>
      </View>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6, backgroundColor: C.bg, borderRadius: 12, padding: 4 }}>
        {OPTIONS.map((o) => {
          const sel = s.lockMode === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => s.setLockMode(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`Road lock ${o.label}`}
              style={{ flex: 1, minHeight: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? (o.id === 'parade' ? C.warnLine : C.line2) : 'transparent' }}
            >
              <Text style={{ color: sel ? C.text : C.muted, fontSize: 17, fontWeight: '700' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={T.sub}>{lockStatus(s)}</Text>
    </View>
  );
}
