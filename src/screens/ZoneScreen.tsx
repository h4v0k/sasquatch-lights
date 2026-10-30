import { Slider } from '../ui/Slider';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colorName } from '../model/colors';
import { knownFor } from '../model/known';
import { FRONT_ZONES, ZONE_LABEL, ZONE_VIEW } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { ScrollLock } from '../ui/ColorWheel';
import { Notice, Section, ToggleRow } from '../ui/parts';
import { S, T } from '../ui/theme';

/** One light: power, brightness, color. Edits save into the active mode. */
export function ZoneScreen({ zone }: { zone: ZoneId }) {
  const [scrollLocked, setScrollLocked] = useState(false);
  const s = useStore();
  const eff = selectEffective(s);
  const z = eff.zones[zone];
  const rules = activeRules(s);
  const rule = rules?.zones[zone];
  const offByRule = !!rule && !rule.allowed;
  const powerFixed = offByRule || !!rule?.mustBeOn;
  const maxBri = rule && rule.allowed ? rule.maxBrightness : 100;
  const front = FRONT_ZONES.includes(zone);
  const colorFixed = !!rule && rule.palette !== 'noPolice'; // headlights white / taillights red under the lock
  const noPolice = front || (!!rule && rule.palette === 'noPolice');
  const active = s.modes.find((m) => m.id === s.activeId);
  const saved = active?.zones[zone] ?? z;
  const devices = s.devices.filter((d) => d.zone === zone);

  let msg = '';
  if (offByRule) msg = `${ZONE_LABEL[zone]} stay off while the Road lock is on.`;
  else if (colorFixed) msg = `Road lock is on: ${rule!.note.toLowerCase()}. Your color comes back when you park.`;
  else if (rule) msg = 'Road lock is on: red and blue are held back until you park.';
  const syncOn = s.sync && !rules;

  return (
    <ScrollLock.Provider value={setScrollLocked}>
    <ScrollView scrollEnabled={!scrollLocked} contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: S.xxl }}>
      <View style={{ gap: S.md }}>
        <CarPreview mode={eff} view={ZONE_VIEW[zone]} label={`${ZONE_LABEL[zone]} on the car`} />
        <Text style={T.sub}>Saves to the {active?.name ?? 'current'} mode.</Text>
      </View>
      {msg ? <Notice text={msg} /> : null}

      <ToggleRow title="Power" value={z.on} onChange={(on) => s.editActiveZone(zone, { on })} disabled={powerFixed} />

      <Section title="Brightness" right={<Text style={T.body}>{z.brightness}%</Text>}>
        <View style={[T.card, { paddingHorizontal: S.sm, paddingVertical: S.xs }]}>
          <Slider
            minimumValue={5}
            maximumValue={Math.max(5, maxBri)}
            step={5}
            value={Math.max(5, Math.min(z.brightness, maxBri))}
            disabled={offByRule || !z.on}
            onSlidingComplete={(v) => s.editActiveZone(zone, { brightness: Math.round(v) })}
            accessibilityLabel={`${ZONE_LABEL[zone]} brightness`}
          />
        </View>
        {maxBri < 100 ? <Text style={T.sub}>Capped at {maxBri}% while locked.</Text> : null}
      </Section>

      <ToggleRow
        title="Use this color on every light"
        sub={rules ? 'Off while the Road lock is on.' : 'When on, picking a color here changes all the lights.'}
        value={syncOn}
        onChange={s.setSync}
        disabled={!!rules}
      />

      <Section title="Color" right={<Text style={T.body}>{z.on ? colorName(z.color) : 'Off'}</Text>}>
        <ColorPicker
          wheelOpen
          value={colorFixed ? z.color : saved.color}
          custom={colorFixed ? z.custom : saved.custom}
          disabled={offByRule || colorFixed}
          blockPolice={noPolice}
          onPick={(color, custom) => s.editActiveZone(zone, custom ? { color, custom } : { color })}
        />
      </Section>

      <Text style={T.small}>
        {devices.length
          ? `Controller${devices.length > 1 ? 's' : ''}: ${devices.map((d) => knownFor(d.name)?.label ?? d.name ?? d.deviceId).join(', ')}`
          : 'No controller set up for this light yet. Add one in Setup.'}
      </Text>
    </ScrollView>
    </ScrollLock.Provider>
  );
}

