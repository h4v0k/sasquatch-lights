import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { screenHex } from '../model/colors';
import { modeMeetsRoadLock, ZONE_LABEL, ZONES } from '../model/modes';
import { rulesFor } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { Btn, Notice } from '../ui/parts';
import { C, T } from '../ui/theme';

const DESC: Record<string, string> = {
  road: 'Fits the Road lock rules. Shows automatically when a mode is blocked.',
  show: 'Full color, everything lit.',
  glow: 'Low glow for night meets.',
};

export function Modes({ openBuilder }: { openBuilder: (editId?: string) => void }) {
  const s = useStore();
  const rules = activeRules(s);
  const stateRules = rulesFor(s.regionCode); // for the badge, whether or not the lock is on right now
  const eff = selectEffective(s);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      {rules ? <Notice text={`Road lock on: modes outside the ${rules.region} rules are blocked. Turn it off on the Garage screen to use them.`} /> : null}
      {s.modes.map((m) => {
        const fits = modeMeetsRoadLock(m, stateRules);
        const blocked = !modeMeetsRoadLock(m, rules);
        const isAct = m.id === eff.id;
        return (
          <View key={m.id} style={[T.card, { borderWidth: isAct ? 2 : 1, borderColor: isAct ? C.accent : C.line, opacity: blocked ? 0.55 : 1 }]}>
            <Pressable
              onPress={blocked ? undefined : () => s.setActive(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isAct, disabled: blocked }}
              accessibilityLabel={`${m.name}${stateRules ? (fits ? ', fits the Road lock' : ', outside the Road lock') : ''}${isAct ? ', active' : ''}`}
              style={{ padding: 14, gap: 10 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: C.text, fontSize: 19, fontWeight: '700' }}>{m.name}</Text>
                  {isAct ? <Text style={{ color: C.onAccent, backgroundColor: C.accent, fontSize: 14, fontWeight: '700', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' }}>Active</Text> : null}
                </View>
                {stateRules ? <Text style={{ fontSize: 14, fontWeight: '700', color: fits ? C.okText : C.muted }}>{fits ? 'Fits Road lock' : 'Outside Road lock'}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ZONES.map((k) => {
                  const z = m.zones[k];
                  return (
                    <View
                      key={k}
                      accessibilityLabel={`${ZONE_LABEL[k]} ${z.on ? 'on' : 'off'}`}
                      style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: z.on ? screenHex(z.color, z.custom) : C.line2, backgroundColor: z.on ? screenHex(z.color, z.custom) : 'transparent' }}
                    />
                  );
                })}
              </View>
              <Text style={T.sub}>{DESC[m.id] ?? 'Custom mode.'}</Text>
            </Pressable>
            {!m.builtin ? (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14, flexWrap: 'wrap' }}>
                {confirmDelete === m.id ? (
                  <>
                    <Btn label="Delete it" onPress={() => { s.deleteMode(m.id); setConfirmDelete(null); }} style={{ flex: 1 }} />
                    <Btn label="Keep" onPress={() => setConfirmDelete(null)} style={{ flex: 1 }} />
                  </>
                ) : (
                  <>
                    <Btn label="Edit" onPress={() => openBuilder(m.id)} style={{ flex: 1 }} />
                    <Btn label="Delete" onPress={() => setConfirmDelete(m.id)} style={{ flex: 1 }} />
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      <Btn label="+  Build a mode" kind="primary" onPress={() => openBuilder()} />
    </ScrollView>
  );
}
