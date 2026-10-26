import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { screenHex } from '../model/colors';
import { modeMeetsRoadLock, ZONE_LABEL, ZONES } from '../model/modes';
import { rulesFor } from '../rules';
import { activeRules, useStore } from '../store';
import { Btn, Notice } from '../ui/parts';
import { C, T } from '../ui/theme';

const DESC: Record<string, string> = {
  road: 'White headlights, red taillights, accents off.',
  show: 'Full color, everything lit.',
  glow: 'Low glow for night meets.',
};

export function Modes({ openBuilder }: { openBuilder: (editId?: string) => void }) {
  const s = useStore();
  const rules = activeRules(s);
  const stateRules = rulesFor(s.regionCode); // for the badge, whether or not the lock is on right now
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      {rules ? <Notice text="Road lock is on: any mode still runs, snapped to legal colors (white headlights, red taillights, no red or blue). It shows as saved once you park." /> : null}
      {s.modes.map((m) => {
        const fits = modeMeetsRoadLock(m, stateRules);
        const isAct = m.id === s.activeId;
        return (
          <View key={m.id} style={[T.card, { borderWidth: isAct ? 2 : 1, borderColor: isAct ? C.accent : C.line, }]}>
            <Pressable
              onPress={() => s.setActive(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isAct }}
              accessibilityLabel={`${m.name}${fits ? ', road legal as saved' : ', snaps to legal colors when locked'}${isAct ? ', active' : ''}`}
              style={{ padding: 14, gap: 10 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: C.text, fontSize: 19, fontWeight: '700' }}>{m.name}</Text>
                  {isAct ? <Text style={{ color: C.onAccent, backgroundColor: C.accent, fontSize: 14, fontWeight: '700', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' }}>Active</Text> : null}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: fits ? C.okText : C.muted }}>{fits ? 'Road legal' : 'Snaps when locked'}</Text>
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
