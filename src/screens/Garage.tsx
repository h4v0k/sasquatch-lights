import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colorName, screenHex } from '../model/colors';
import { modeMeetsRoadLock, ROAD_ID, ZONE_LABEL, ZONES } from '../model/modes';
import { rulesFor, type ZoneId } from '../rules';
import { isDriving, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { Btn, Dot, Notice, Section } from '../ui/parts';
import { C, T } from '../ui/theme';

export function Garage({ openZone, openModes }: { openZone: (z: ZoneId) => void; openModes: () => void }) {
  const s = useStore();
  const [view, setView] = useState<'side' | 'front' | 'rear'>('side');
  const driving = isDriving(s);
  const rules = rulesFor(s.regionCode);
  const eff = selectEffective(s);
  const active = s.modes.find((m) => m.id === s.activeId);
  const restricted = eff.id === ROAD_ID;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      {driving && active && eff.id !== active.id ? (
        <Notice text={`${active.name} is paused. Road mode is on until you park.`} />
      ) : driving ? (
        <Notice kind="ok" text={`${eff.name} meets the Road lock rules, so it stays on while you drive.`} />
      ) : null}

      <View style={{ gap: 10 }}>
        <CarPreview mode={eff} view={view} />
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, backgroundColor: C.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.line }}>
          {(['side', 'front', 'rear'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
              style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: view === v ? C.line : 'transparent' }}
            >
              <Text style={{ color: view === v ? C.text : C.muted, fontSize: 16, fontWeight: '600' }}>{v === 'side' ? 'Side' : v === 'front' ? 'Front' : 'Rear'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Section title="Mode" right={<Btn label="All modes" onPress={openModes} style={{ minHeight: 44, paddingHorizontal: 12 }} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {s.modes.map((m) => {
            const ok = modeMeetsRoadLock(m, rules);
            const locked = driving && !ok;
            return (
              <Btn
                key={m.id}
                label={m.name}
                kind={m.id === eff.id ? 'chipOn' : 'chip'}
                disabled={locked}
                onPress={() => s.setActive(m.id)}
                a11y={`${m.name}, ${ok ? 'meets Road lock' : 'parked only'}${locked ? ', locked while driving' : ''}`}
              />
            );
          })}
        </ScrollView>
      </Section>

      <Section
        title="Zones"
        right={
          <Pressable
            onPress={restricted || driving ? undefined : () => s.setSync(!s.sync)}
            accessibilityRole="switch"
            accessibilityState={{ checked: s.sync && !restricted, disabled: restricted || driving }}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: restricted || driving ? 0.45 : 1 }}
          >
            <Text style={T.body}>Color sync</Text>
            <Text style={{ color: s.sync && !restricted ? C.ok : C.muted, fontSize: 16, fontWeight: '700' }}>{s.sync && !restricted ? 'On' : 'Off'}</Text>
          </Pressable>
        }
      >
        {ZONES.map((k) => {
          const z = eff.zones[k];
          const offByRule = restricted && !rules.zones[k].allowed;
          return (
            <View key={k} style={[T.card, { flexDirection: 'row', alignItems: 'center', minHeight: 68 }]}>
              <Pressable
                onPress={() => openZone(k)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${ZONE_LABEL[k]}`}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
              >
                <Dot color={z.on ? screenHex(z.color, z.custom) : null} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={T.strong}>{ZONE_LABEL[k]}</Text>
                  <Text style={T.sub}>{z.on ? `${colorName(z.color)} · ${z.brightness}%` : offByRule ? 'Off in Road mode' : 'Off'}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
              </Pressable>
              <Pressable
                onPress={driving || offByRule ? undefined : () => s.editActiveZone(k, { on: !z.on })}
                accessibilityRole="switch"
                accessibilityLabel={ZONE_LABEL[k]}
                accessibilityState={{ checked: z.on, disabled: driving || offByRule }}
                style={{ minWidth: 72, minHeight: 56, alignItems: 'center', justifyContent: 'center', opacity: driving || offByRule ? 0.4 : 1 }}
              >
                <View style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: z.on ? C.ok : C.line2, alignItems: z.on ? 'flex-end' : 'flex-start' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.text }} />
                </View>
              </Pressable>
            </View>
          );
        })}
        <Btn label="All lights off" onPress={s.allOff} disabled={driving} />
      </Section>
    </ScrollView>
  );
}
