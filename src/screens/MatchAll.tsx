import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { shownZones } from '../model/known';
import { activeRules, selectEffective, useStore } from '../store';
import { CarPreview } from '../ui/CarPreview';
import { ColorPicker } from '../ui/ColorPicker';
import { ScrollLock } from '../ui/ColorWheel';
import { Notice } from '../ui/parts';
import { S, T } from '../ui/theme';

/** One solid color on every light, saved into the current mode. */
export function MatchAll() {
  const s = useStore();
  const [scrollLocked, setScrollLocked] = useState(false);
  const eff = selectEffective(s);
  const locked = !!activeRules(s);
  const ui = s.modes.find((m) => m.id === s.activeId) ?? eff;
  const zones = shownZones(s.devices);
  const first = ui.zones[zones[0] ?? 'under'];
  // Highlight the color only when every shown light already shares it.
  const shared = zones.every((k) => ui.zones[k].color === first.color && (first.color !== 'custom' || ui.zones[k].custom.join() === first.custom.join()));

  return (
    <ScrollLock.Provider value={setScrollLocked}>
      <ScrollView scrollEnabled={!scrollLocked} contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: S.xxl }}>
        <CarPreview mode={eff} view="side" />
        {locked ? <Notice text="Road lock is on, so taillights stay red for now. Your color shows on every light once you park." /> : null}
        <Text style={T.sub}>Pick a color and every light switches to it. It saves into the {ui.name} mode.</Text>
        <ColorPicker
          value={shared ? first.color : null}
          custom={first.custom}
          blockPolice
          onPick={(color, custom) => s.matchAllLights(color, custom ?? first.custom)}
        />
      </ScrollView>
    </ScrollLock.Provider>
  );
}
