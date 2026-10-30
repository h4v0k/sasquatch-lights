import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { screenHex } from '../model/colors';
import { shownZones } from '../model/known';
import { modeMeetsRoadLock, ZONE_LABEL } from '../model/modes';
import { rulesFor } from '../rules';
import { useStore } from '../store';
import { Btn, Icon } from '../ui/parts';
import { C, S, T } from '../ui/theme';

const DESC: Record<string, string> = {
  road: 'Legal for driving: white headlights, red taillights, accents off.',
  show: 'Everything lit, full color.',
  glow: 'A low glow for night meets.',
};

export function Modes({ openBuilder }: { openBuilder: (editId?: string) => void }) {
  const s = useStore();
  const stateRules = rulesFor(s.regionCode);
  const zones = shownZones(s.devices);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: S.xxl }}>
      <Text style={T.sub}>Tap a mode to switch to it. Build your own for shows and meets.</Text>
      {s.modes.map((m) => {
        const fits = modeMeetsRoadLock(m, stateRules);
        const isAct = m.id === s.activeId;
        const confirming = confirmDelete === m.id;
        return (
          <View key={m.id} style={[T.card, { borderWidth: isAct ? 2 : 1, borderColor: isAct ? C.accent : C.line }]}>
            <Pressable
              onPress={() => s.setActive(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isAct }}
              accessibilityLabel={`${m.name}${isAct ? ', active' : ''}. ${DESC[m.id] ?? 'Custom mode.'}`}
              style={({ pressed }) => [{ padding: S.lg, gap: S.sm }, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Text style={[T.h2, { flex: 1 }]}>{m.name}</Text>
                {isAct ? <Icon name="checkmark-circle" color={C.accent} size={26} /> : null}
              </View>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {zones.map((k) => {
                  const z = m.zones[k];
                  const hex = z.on ? screenHex(z.color, z.custom) : null;
                  return (
                    <View key={k} accessibilityLabel={`${ZONE_LABEL[k]} ${z.on ? 'on' : 'off'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: hex ?? C.line2, backgroundColor: hex ?? 'transparent' }} />
                      <Text style={T.small}>{ZONE_LABEL[k]}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={T.sub}>{DESC[m.id] ?? 'Your mode.'}</Text>
              {fits ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="shield-checkmark" color={C.ok} size={16} />
                  <Text style={[T.small, { color: C.okText }]}>Road legal as is</Text>
                </View>
              ) : null}
            </Pressable>
            {!m.builtin ? (
              <View style={{ flexDirection: 'row', gap: S.sm, paddingHorizontal: S.lg, paddingBottom: S.lg }}>
                {confirming ? (
                  <>
                    <Btn label="Delete" kind="danger" icon="trash-outline" onPress={() => { s.deleteMode(m.id); setConfirmDelete(null); }} style={{ flex: 1 }} a11y={`Confirm delete ${m.name}`} />
                    <Btn label="Keep it" onPress={() => setConfirmDelete(null)} style={{ flex: 1 }} />
                  </>
                ) : (
                  <>
                    <Btn label="Edit" icon="create-outline" onPress={() => openBuilder(m.id)} style={{ flex: 1 }} a11y={`Edit ${m.name}`} />
                    <Btn label="Delete" kind="quiet" icon="trash-outline" onPress={() => setConfirmDelete(m.id)} style={{ flex: 1 }} a11y={`Delete ${m.name}`} />
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      <Btn label="Build a mode" kind="primary" icon="add" onPress={() => openBuilder()} style={{ marginTop: S.sm }} />
      <Text style={T.small}>Any mode can be used while driving; the Road lock holds it to legal colors until you park.</Text>
    </ScrollView>
  );
}
