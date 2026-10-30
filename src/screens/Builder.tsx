import { Slider } from '../ui/Slider';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colorName, screenHex } from '../model/colors';
import { shownZones } from '../model/known';
import { applyFrontFloor, blankMode, editZone, FRONT_ZONES, modeMeetsRoadLock, ZONE_LABEL, ZONE_VIEW, type Mode } from '../model/modes';
import { rulesFor, type ZoneId } from '../rules';
import { useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { ScrollLock } from '../ui/ColorWheel';
import { Btn, Dot, Icon, Notice, Toggle, ToggleRow } from '../ui/parts';
import { C, S, T } from '../ui/theme';

/** Build or edit a mode. One light open at a time; the preview follows the open light. */
export function Builder({ editId, done }: { editId?: string; done: () => void }) {
  const s = useStore();
  const [draft, setDraft] = useState<Mode>(() => {
    const m = editId ? s.modes.find((x) => x.id === editId) : undefined;
    return m ? (JSON.parse(JSON.stringify(m)) as Mode) : blankMode();
  });
  const [same, setSame] = useState(false);
  const [open, setOpen] = useState<ZoneId | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const zones = shownZones(s.devices);
  const fits = modeMeetsRoadLock(draft, rulesFor(s.regionCode));

  return (
    <ScrollLock.Provider value={setScrollLocked}>
    <ScrollView scrollEnabled={!scrollLocked} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: S.xxl }}>
      <View style={{ gap: S.sm }}>
        <Text style={T.strong} nativeID="modeNameLabel">Name</Text>
        <TextInput
          value={draft.name}
          onChangeText={(n) => setDraft({ ...draft, name: n })}
          placeholder="e.g. Slamfest night"
          placeholderTextColor={C.muted}
          accessibilityLabelledBy="modeNameLabel"
          style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, color: C.text, fontSize: 18, paddingHorizontal: 14 }}
        />
      </View>

      <CarPreview mode={applyFrontFloor(draft)} view={open ? ZONE_VIEW[open] : 'side'} />

      <ToggleRow title="Same color on every light" sub="Pick a color once and every light follows." value={same} onChange={setSame} />

      <View style={T.card}>
        {zones.map((k, i) => {
          const z = draft.zones[k];
          const isOpen = open === k;
          return (
            <View key={k} style={{ borderBottomWidth: i === zones.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={() => setOpen(isOpen ? null : k)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${ZONE_LABEL[k]}, ${z.on ? colorName(z.color) : 'off'}`}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingLeft: S.lg, minHeight: 64 }}
                >
                  <Dot color={z.on ? screenHex(z.color, z.custom) : null} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={T.strong}>{ZONE_LABEL[k]}</Text>
                    <Text style={T.sub}>{z.on ? `${colorName(z.color)} · ${z.brightness}%` : 'Off'}</Text>
                  </View>
                  <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} color={C.muted} size={20} />
                </Pressable>
                <View style={{ paddingRight: S.sm }}>
                  <Toggle value={z.on} label={`${ZONE_LABEL[k]} power`} onChange={(on) => setDraft(editZone(draft, k, { on }, false))} />
                </View>
              </View>
              {isOpen ? (
                <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg, gap: S.lg, opacity: z.on ? 1 : 0.45 }}>
                  <View style={{ gap: S.xs }}>
                    <Text style={T.sub}>Brightness {z.brightness}%</Text>
                    <Slider
                      minimumValue={5}
                      maximumValue={100}
                      step={5}
                      value={z.brightness}
                      disabled={!z.on}
                      onSlidingComplete={(v) => setDraft(editZone(draft, k, { brightness: Math.round(v) }, false))}
                      accessibilityLabel={`${ZONE_LABEL[k]} brightness`}
                    />
                  </View>
                  <ColorPicker
                    value={z.color}
                    custom={z.custom}
                    disabled={!z.on}
                    blockPolice={same || FRONT_ZONES.includes(k)}
                    onPick={(color, custom) => setDraft(editZone(draft, k, custom ? { color, custom } : { color }, same))}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Notice
        kind={fits ? 'ok' : 'info'}
        text={fits ? 'Road legal as is.' : 'Fine for shows. While driving, the Road lock holds it to legal colors.'}
      />
      <Btn
        label={editId ? 'Save changes' : 'Save mode'}
        kind="primary"
        onPress={() => { s.saveMode(draft); done(); }}
      />
    </ScrollView>
    </ScrollLock.Provider>
  );
}
