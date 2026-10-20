import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colorName, screenHex } from '../model/colors';
import { modeMeetsRoadLock, ZONE_LABEL, ZONES } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { Btn, Dot, Notice, Section, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

export function Garage({ openZone, openModes }: { openZone: (z: ZoneId) => void; openModes: () => void }) {
  const s = useStore();
  const [view, setView] = useState<'side' | 'front' | 'rear'>('side');
  const rules = activeRules(s);
  const eff = selectEffective(s);
  const active = s.modes.find((m) => m.id === s.activeId);
  const paused = !!active && eff.id !== active.id;

  let lockSub: string;
  if (!s.roadLock) lockSub = 'Off: any color except red or blue up front';
  else if (rules) lockSub = `On: ${rules.region} rules apply`;
  else if (s.location === 'denied' || s.location === 'unavailable') lockSub = 'On, but no location: only red and blue are blocked up front';
  else if (s.location === 'starting') lockSub = 'On: finding your state';
  else lockSub = 'On, but no rule set for this state: only red and blue are blocked up front';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <ToggleRow title="Road lock" sub={lockSub} value={s.roadLock} onChange={s.setRoadLock} />
      {paused ? <Notice text={`${active!.name} is paused while the Road lock is on. Road mode is showing.`} /> : null}

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
            return (
              <Btn
                key={m.id}
                label={m.name}
                kind={m.id === eff.id ? 'chipOn' : 'chip'}
                disabled={!ok}
                onPress={() => s.setActive(m.id)}
                a11y={`${m.name}${ok ? '' : ', blocked by the Road lock'}`}
              />
            );
          })}
        </ScrollView>
      </Section>

      <Section
        title="Zones"
        right={
          <Pressable
            onPress={rules ? undefined : () => s.setSync(!s.sync)}
            accessibilityRole="switch"
            accessibilityState={{ checked: s.sync && !rules, disabled: !!rules }}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: rules ? 0.45 : 1 }}
          >
            <Text style={T.body}>Color sync</Text>
            <Text style={{ color: s.sync && !rules ? C.ok : C.muted, fontSize: 16, fontWeight: '700' }}>{s.sync && !rules ? 'On' : 'Off'}</Text>
          </Pressable>
        }
      >
        {ZONES.map((k) => {
          const z = eff.zones[k];
          const r = rules?.zones[k];
          const fixed = !!r && (!r.allowed || !!r.mustBeOn); // the rules decide power for this zone
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
                  <Text style={T.sub}>{z.on ? `${colorName(z.color)} · ${z.brightness}%` : r && !r.allowed ? 'Off under the Road lock' : 'Off'}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
              </Pressable>
              <Pressable
                onPress={fixed ? undefined : () => s.editActiveZone(k, { on: !z.on })}
                accessibilityRole="switch"
                accessibilityLabel={ZONE_LABEL[k]}
                accessibilityState={{ checked: z.on, disabled: fixed }}
                style={{ minWidth: 72, minHeight: 56, alignItems: 'center', justifyContent: 'center', opacity: fixed ? 0.4 : 1 }}
              >
                <View style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: z.on ? C.ok : C.line2, alignItems: z.on ? 'flex-end' : 'flex-start' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.text }} />
                </View>
              </Pressable>
            </View>
          );
        })}
        <Btn label="All lights off" onPress={s.allOff} />
      </Section>
    </ScrollView>
  );
}
