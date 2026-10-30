import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colorName, screenHex } from '../model/colors';
import { shownZones } from '../model/known';
import { ZONE_LABEL } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { lockSummary } from '../ui/LockControl';
import { Btn, Dot, Icon, NavRow, Section, Toggle } from '../ui/parts';
import { C, S, T } from '../ui/theme';

export type GaragePage = 'lock' | 'matchAll';

/** Home: what the car looks like now, the lock, the mode, and each light. */
export function Garage({ openZone, openPage, openModes }: {
  openZone: (z: ZoneId) => void; openPage: (p: GaragePage) => void; openModes: () => void;
}) {
  const s = useStore();
  const rules = activeRules(s);
  const eff = selectEffective(s);
  const lock = lockSummary(s);
  const zones = shownZones(s.devices);
  const active = s.modes.find((m) => m.id === s.activeId);

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: S.xxl }}>
      <View style={{ gap: S.md }}>
        <CarPreview mode={eff} view="side" label={`The car with the ${active?.name ?? 'current'} lights`} />
        <NavRow
          icon={lock.on ? 'shield-checkmark' : 'lock-open-outline'}
          iconColor={lock.on ? C.ok : C.accent}
          title={lock.title}
          sub={lock.line}
          onPress={() => openPage('lock')}
          a11y={`${lock.title}. ${lock.line}. Open Road lock settings`}
        />
      </View>

      <Section
        title="Mode"
        hint="A mode sets every light at once."
        right={<Btn label="Edit modes" kind="quiet" onPress={openModes} style={{ minHeight: 44, paddingHorizontal: 4 }} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {s.modes.map((m) => (
            <Btn key={m.id} label={m.name} kind={m.id === s.activeId ? 'chipOn' : 'chip'} onPress={() => s.setActive(m.id)} />
          ))}
        </ScrollView>
      </Section>

      <Section title="Lights" hint="Tap a light to change its color and brightness. Changes save to the current mode.">
        <View style={T.card}>
          {zones.map((k, i) => {
            const z = eff.zones[k];
            const r = rules?.zones[k];
            const fixed = !!r && (!r.allowed || !!r.mustBeOn); // the lock decides power for this zone
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: i === zones.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                <Pressable
                  onPress={() => openZone(k)}
                  accessibilityRole="button"
                  accessibilityLabel={`${ZONE_LABEL[k]}, ${z.on ? colorName(z.color) : 'off'}. Edit`}
                  style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingLeft: S.lg, minHeight: 64 }, pressed && { opacity: 0.7 }]}
                >
                  <Dot color={z.on ? screenHex(z.color, z.custom) : null} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={T.strong}>{ZONE_LABEL[k]}</Text>
                    <Text style={T.sub}>{z.on ? `${colorName(z.color)} · ${z.brightness}%` : r && !r.allowed ? 'Off while locked' : 'Off'}</Text>
                  </View>
                  <Icon name="chevron-forward" color={C.muted} size={18} />
                </Pressable>
                <View style={{ paddingRight: S.sm }}>
                  <Toggle value={z.on} disabled={fixed} label={`${ZONE_LABEL[k]} power`} onChange={(on) => s.editActiveZone(k, { on })} />
                </View>
              </View>
            );
          })}
        </View>
        <NavRow icon="color-fill-outline" title="One color for every light" sub="Paint the whole car one color" onPress={() => openPage('matchAll')} />
        <Btn label="Turn all lights off" kind="danger" icon="power" onPress={s.allOff} />
      </Section>
    </ScrollView>
  );
}
