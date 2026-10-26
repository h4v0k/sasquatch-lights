import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colorName, screenHex } from '../model/colors';
import { ZONE_LABEL, ZONES } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { ScrollLock } from '../ui/ColorWheel';
import { LockControl } from '../ui/LockControl';
import { Btn, Dot, Notice, Section } from '../ui/parts';
import { C, T } from '../ui/theme';

export function Garage({ openZone, openModes }: { openZone: (z: ZoneId) => void; openModes: () => void }) {
  const s = useStore();
  const [view, setView] = useState<'side' | 'front' | 'rear'>('side');
  const rules = activeRules(s);
  const eff = selectEffective(s);
  const [scrollLocked, setScrollLocked] = useState(false);
  const snapped = !!rules;
  const ui = s.modes.find((m) => m.id === s.activeId) ?? eff;
  // The wheel shows the color the active mode shares, when every light has the same one.
  const first = ui.zones.under;
  const shared = ZONES.every((k) => ui.zones[k].color === first.color && (first.color !== 'custom' || ui.zones[k].custom.join() === first.custom.join()));

  return (
    <ScrollLock.Provider value={setScrollLocked}>
    <ScrollView scrollEnabled={!scrollLocked} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <LockControl />

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

      <Section title="Match all lights">
        {snapped ? <Notice text="Road lock is on: headlights stay white and taillights red; the rest take this color unless it's red or blue, which shifts to the nearest allowed shade. Your pick comes back when you park." /> : null}
        <ColorPicker
          value={shared ? first.color : null}
          custom={first.custom}
          blockPolice
          onPick={(color, custom) => s.matchAllLights(color, custom ?? first.custom)}
        />
        <Text style={T.sub}>One solid color on every light. Red and blue are left out so the front can match too.</Text>
      </Section>

      <Section title="Mode" right={<Btn label="All modes" onPress={openModes} style={{ minHeight: 44, paddingHorizontal: 12 }} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {s.modes.map((m) => {
            return <Btn key={m.id} label={m.name} kind={m.id === s.activeId ? 'chipOn' : 'chip'} onPress={() => s.setActive(m.id)} />;
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
          const fixed = !!r && (!r.allowed || !!r.mustBeOn); // the lock decides power for this zone
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
    </ScrollLock.Provider>
  );
}
