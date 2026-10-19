import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { screenHex } from '../model/colors';
import { modeMeetsRoadLock, ZONE_LABEL, ZONES } from '../model/modes';
import { rulesFor } from '../rules';
import { isDriving, selectEffective, useStore } from '../store';
import { Btn, Notice } from '../ui/parts';
import { C, T } from '../ui/theme';

const DESC: Record<string, string> = {
  road: 'Locked to the Road lock rules. Turns on by itself when you drive.',
  show: 'Full color, everything lit. Parked only.',
  glow: 'Low glow for night meets. Parked only.',
};

export function Modes({ openBuilder }: { openBuilder: (editId?: string) => void }) {
  const s = useStore();
  const driving = isDriving(s);
  const rules = rulesFor(s.regionCode);
  const eff = selectEffective(s);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      {driving ? <Notice text="Driving: only modes that meet the Road lock rules can be picked. Park to edit." /> : null}
      {s.modes.map((m) => {
        const ok = modeMeetsRoadLock(m, rules);
        const isAct = m.id === eff.id;
        const locked = driving && !ok;
        return (
          <View key={m.id} style={[T.card, { borderWidth: isAct ? 2 : 1, borderColor: isAct ? C.accent : C.line, opacity: locked ? 0.5 : 1 }]}>
            <Pressable
              onPress={locked ? undefined : () => s.setActive(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isAct, disabled: locked }}
              accessibilityLabel={`${m.name}, ${ok ? 'meets Road lock' : 'parked only'}${isAct ? ', active' : ''}`}
              style={{ padding: 14, gap: 10 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: C.text, fontSize: 19, fontWeight: '700' }}>{m.name}</Text>
                  {isAct ? <Text style={{ color: C.onAccent, backgroundColor: C.accent, fontSize: 14, fontWeight: '700', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' }}>Active</Text> : null}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ok ? C.okText : C.muted }}>{ok ? 'Meets Road lock' : 'Parked only'}</Text>
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
              <Text style={T.sub}>{DESC[m.id] ?? (ok ? 'Custom. Can stay on while driving.' : 'Custom. Parked only.')}</Text>
            </Pressable>
            {!m.builtin && !driving ? (
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
      <Btn label="+  Build a mode" kind="primary" onPress={() => openBuilder()} disabled={driving} />
    </ScrollView>
  );
}
