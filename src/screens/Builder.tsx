import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { applyFrontFloor, blankMode, editZone, FRONT_ZONES, modeMeetsRoadLock, ZONE_LABEL, ZONES, type Mode } from '../model/modes';
import { rulesFor } from '../rules';
import { useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { Btn, Notice, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

export function Builder({ editId, done }: { editId?: string; done: () => void }) {
  const s = useStore();
  const [draft, setDraft] = useState<Mode>(() => {
    const m = editId ? s.modes.find((x) => x.id === editId) : undefined;
    return m ? (JSON.parse(JSON.stringify(m)) as Mode) : blankMode();
  });
  const [same, setSame] = useState(false);
  const [view, setView] = useState<'side' | 'front' | 'rear'>('side');
  const stateRules = rulesFor(s.regionCode);
  const fits = modeMeetsRoadLock(draft, stateRules);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <View style={{ gap: 6 }}>
        <Text style={T.strong} nativeID="modeNameLabel">Mode name</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder="e.g. Slamfest night"
          placeholderTextColor={C.muted}
          accessibilityLabelledBy="modeNameLabel"
          style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, color: C.text, fontSize: 18, paddingHorizontal: 14 }}
        />
      </View>
      <CarPreview mode={applyFrontFloor(draft)} view={view} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['side', 'front', 'rear'] as const).map((v) => (
          <Btn key={v} label={v[0].toUpperCase() + v.slice(1)} kind={view === v ? 'chipOn' : 'chip'} onPress={() => setView(v)} style={{ flex: 1 }} />
        ))}
      </View>
      {stateRules ? (
        <Notice
          kind={fits ? 'ok' : 'info'}
          text={fits ? `Fits the ${stateRules.region} Road lock rules: it can run with the lock on.` : 'Outside the Road lock rules: use it with the Road lock off.'}
        />
      ) : null}
      <ToggleRow title="Same color everywhere" sub="Pick once, all five zones follow" value={same} onChange={setSame} />
      {ZONES.map((k) => {
        const z = draft.zones[k];
        return (
          <View key={k} style={[T.card, { padding: 14, gap: 12 }]}>
            <ToggleRow title={ZONE_LABEL[k]} value={z.on} onChange={(on) => setDraft(editZone(draft, k, { on }, false))} />
            {z.on ? (
              <>
                <ColorPicker
                  value={z.color}
                  custom={z.custom}
                  blockPolice={same || FRONT_ZONES.includes(k)}
                  onPick={(color, custom) => setDraft(editZone(draft, k, custom ? { color, custom } : { color }, same))}
                />
                <View style={{ gap: 4 }}>
                  <Text style={T.sub}>Brightness {z.brightness}%</Text>
                  <Slider
                    style={{ height: 48 }}
                    minimumValue={5}
                    maximumValue={100}
                    step={5}
                    value={z.brightness}
                    onSlidingComplete={(v) => setDraft(editZone(draft, k, { brightness: Math.round(v) }, false))}
                    minimumTrackTintColor={C.accent}
                    maximumTrackTintColor={C.line2}
                    thumbTintColor={C.text}
                    accessibilityLabel={`${ZONE_LABEL[k]} brightness`}
                  />
                </View>
              </>
            ) : null}
          </View>
        );
      })}
      <Btn label={editId ? 'Save changes' : 'Save mode'} kind="primary" onPress={() => { s.saveMode(draft); done(); }} />
    </ScrollView>
  );
}
