import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colorName } from '../model/colors';
import { FRONT_ZONES, ZONE_LABEL, ZONE_VIEW } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { ScrollLock } from '../ui/ColorWheel';
import { Notice, Section, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

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
  const saved = s.modes.find((m) => m.id === s.activeId)?.zones[zone] ?? z;
  const devices = s.devices.filter((d) => d.zone === zone);

  let msg = '';
  let warn = true;
  if (offByRule) msg = `${ZONE_LABEL[zone]} stay off while the Road lock is on (${rules!.region}).`;
  else if (rule) msg = `Road lock is on: ${rule.note.toLowerCase()}.${colorFixed ? ' Your color comes back when you park.' : ''}`;
  else if (s.sync) { msg = `Color sync is on, so a new color goes to every zone in ${eff.name}.`; warn = false; }

  return (
    <ScrollLock.Provider value={setScrollLocked}>
    <ScrollView scrollEnabled={!scrollLocked} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      <CarPreview mode={eff} view={ZONE_VIEW[zone]} label={`${ZONE_LABEL[zone]} on the car`} />
      {msg ? <Notice text={msg} kind={warn ? 'warn' : 'ok'} /> : null}
      <ToggleRow
        title="Power"
        sub={devices.length ? devices.map((d) => d.name ?? d.deviceId).join(', ') : 'No controller assigned yet'}
        value={z.on}
        onChange={(on) => s.editActiveZone(zone, { on })}
        disabled={powerFixed}
      />
      <Section title="Color" right={<Text style={T.body}>{z.on ? colorName(z.color) : 'Off'}</Text>}>
        <ColorPicker
          value={colorFixed ? z.color : saved.color}
          custom={colorFixed ? z.custom : saved.custom}
          disabled={offByRule || colorFixed}
          blockPolice={noPolice}
          onPick={(color, custom) => s.editActiveZone(zone, custom ? { color, custom } : { color })}
        />
        {front ? <Text style={T.sub}>Red and blue (including ice blue) are always blocked on front-facing lights.</Text> : noPolice ? <Text style={T.sub}>Red and blue are blocked while the Road lock is on.</Text> : null}
      </Section>
      <Section title="Brightness" right={<Text style={T.body}>{z.brightness}%</Text>}>
        <View style={[T.card, { paddingHorizontal: 8, paddingVertical: 6 }]}>
          <Slider
            style={{ height: 48 }}
            minimumValue={5}
            maximumValue={Math.max(5, maxBri)}
            step={5}
            value={Math.max(5, Math.min(z.brightness, maxBri))}
            disabled={offByRule}
            onSlidingComplete={(v) => s.editActiveZone(zone, { brightness: Math.round(v) })}
            minimumTrackTintColor={C.accent}
            maximumTrackTintColor={C.line2}
            thumbTintColor={C.text}
            accessibilityLabel={`${ZONE_LABEL[zone]} brightness`}
          />
        </View>
        {maxBri < 100 ? <Text style={T.sub}>Capped at {maxBri}% while the Road lock is on.</Text> : null}
      </Section>
    </ScrollView>
    </ScrollLock.Provider>
  );
}
