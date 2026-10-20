import Slider from '@react-native-community/slider';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colorName } from '../model/colors';
import { FRONT_ZONES, ZONE_LABEL, ZONE_VIEW } from '../model/modes';
import { type ZoneId } from '../rules';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { Notice, Section, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

export function ZoneScreen({ zone }: { zone: ZoneId }) {
  const s = useStore();
  const eff = selectEffective(s);
  const z = eff.zones[zone];
  const rules = activeRules(s);
  const rule = rules?.zones[zone];
  const offByRule = !!rule && !rule.allowed;
  const powerFixed = offByRule || !!rule?.mustBeOn;
  const maxBri = rule && rule.allowed ? rule.maxBrightness : 100;
  const front = FRONT_ZONES.includes(zone);
  const devices = s.devices.filter((d) => d.zone === zone);

  let msg = '';
  let warn = true;
  if (offByRule) msg = `${ZONE_LABEL[zone]} stay off while the Road lock is on (${rules!.region}).`;
  else if (rule) msg = `Road lock (${rules!.region}): ${rule.note.toLowerCase()}.`;
  else if (s.sync) { msg = `Color sync is on, so a new color goes to every zone in ${eff.name}.`; warn = false; }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
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
          value={z.color}
          custom={z.custom}
          disabled={offByRule}
          allowed={rule ? rule.colors : undefined}
          blockPolice={front}
          onPick={(color, custom) => s.editActiveZone(zone, custom ? { color, custom } : { color })}
        />
        {front ? <Text style={T.small}>Red and blue are always blocked on front-facing lights.</Text> : null}
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
        {maxBri < 100 ? <Text style={T.small}>Capped at {maxBri}% while the Road lock is on.</Text> : null}
      </Section>
    </ScrollView>
  );
}
