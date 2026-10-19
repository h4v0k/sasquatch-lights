import Slider from '@react-native-community/slider';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { colorName } from '../model/colors';
import { ROAD_ID, ZONE_LABEL, ZONE_VIEW } from '../model/modes';
import { rulesFor, type ZoneId } from '../rules';
import { isDriving, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { Notice, Section, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

export function ZoneScreen({ zone }: { zone: ZoneId }) {
  const s = useStore();
  const driving = isDriving(s);
  const eff = selectEffective(s);
  const z = eff.zones[zone];
  const rule = rulesFor(s.regionCode).zones[zone];
  const restricted = eff.id === ROAD_ID;
  const offByRule = restricted && !rule.allowed;
  const ro = driving || offByRule;
  const maxBri = restricted && rule.allowed ? rule.maxBrightness : 100;
  const devices = s.devices.filter((d) => d.zone === zone);

  let msg = '';
  let warn = true;
  if (driving) msg = 'Park to change lights. Editing is locked while driving.';
  else if (offByRule) msg = `${ZONE_LABEL[zone]} stay off in Road mode.`;
  else if (restricted) msg = `Road mode: ${rule.note.toLowerCase()}.`;
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
        disabled={ro}
      />
      <Section title="Color" right={<Text style={T.body}>{z.on ? colorName(z.color) : 'Off'}</Text>}>
        <ColorPicker
          value={z.color}
          custom={z.custom}
          disabled={ro}
          allowed={restricted ? rule.colors : undefined}
          onPick={(color, custom) => s.editActiveZone(zone, custom ? { color, custom } : { color })}
        />
      </Section>
      <Section title="Brightness" right={<Text style={T.body}>{z.brightness}%</Text>}>
        <View style={[T.card, { paddingHorizontal: 8, paddingVertical: 6 }]}>
          <Slider
            style={{ height: 48 }}
            minimumValue={5}
            maximumValue={maxBri}
            step={5}
            value={Math.min(z.brightness, maxBri)}
            disabled={ro}
            onSlidingComplete={(v) => s.editActiveZone(zone, { brightness: Math.round(v) })}
            minimumTrackTintColor={C.accent}
            maximumTrackTintColor={C.line2}
            thumbTintColor={C.text}
            accessibilityLabel={`${ZONE_LABEL[zone]} brightness`}
          />
        </View>
        {maxBri < 100 ? <Text style={T.small}>Capped at {maxBri}% in Road mode.</Text> : null}
      </Section>
    </ScrollView>
  );
}
