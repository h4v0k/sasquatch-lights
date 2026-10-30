import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SWATCHES, toHex, type Rgb } from '../model/colors';
import { isPoliceColor } from '../model/modes';
import type { ColorId } from '../rules';
import { ColorWheel } from './ColorWheel';
import { Icon } from './parts';
import { C, T } from './theme';

/**
 * Preset swatches plus a "Custom" swatch that opens the color wheel. `allowed` limits choices (Road lock rules);
 * `blockPolice` hides red and blue (always on for front-facing zones). Blocked swatches are left out, not crossed out.
 */
export function ColorPicker({ value, custom, onPick, allowed, disabled, blockPolice, wheelOpen }: {
  value: ColorId | null; custom: Rgb; onPick: (c: ColorId, custom?: Rgb) => void; allowed?: ColorId[]; disabled?: boolean; blockPolice?: boolean;
  /** Show the wheel from the start (light and one-color screens). */
  wheelOpen?: boolean;
}) {
  const canCustom = !disabled && (!allowed || allowed.includes('custom'));
  const [wheel, setWheel] = useState(!!wheelOpen || value === 'custom');
  const shown = SWATCHES.filter((s) => !(blockPolice && isPoliceColor(s.rgb)) && (!allowed || allowed.includes(s.id)));
  const customSel = value === 'custom';

  return (
    <View style={{ gap: 14, opacity: disabled ? 0.45 : 1 }}>
      <View style={styles.grid}>
        {shown.map((s) => {
          const sel = value === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={disabled ? undefined : () => { if (!wheelOpen) setWheel(false); onPick(s.id); }}
              accessibilityRole="button"
              accessibilityLabel={s.name}
              accessibilityState={{ selected: sel, disabled: !!disabled }}
              style={styles.cell}
            >
              <View style={[styles.ring, { borderColor: sel ? C.text : 'transparent' }]}>
                <View style={[styles.sw, { backgroundColor: toHex(s.rgb) }]} />
              </View>
              <Text style={[styles.name, sel && { color: C.text }]} numberOfLines={2}>{s.name}</Text>
            </Pressable>
          );
        })}
        {canCustom ? (
          <Pressable
            onPress={() => setWheel(!wheel)}
            accessibilityRole="button"
            accessibilityLabel={wheel ? 'Hide custom color wheel' : 'Pick a custom color'}
            accessibilityState={{ selected: customSel, expanded: wheel }}
            style={styles.cell}
          >
            <View style={[styles.ring, { borderColor: customSel ? C.text : 'transparent' }]}>
              <View style={[styles.sw, { backgroundColor: customSel ? toHex(custom) : C.surface2, borderWidth: customSel ? 0 : 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }]}>
                {customSel ? null : <Icon name="color-palette" size={22} color={C.muted} />}
              </View>
            </View>
            <Text style={[styles.name, customSel && { color: C.text }]} numberOfLines={2}>Custom</Text>
          </Pressable>
        ) : null}
      </View>
      {canCustom && wheel ? (
        <ColorWheel value={custom} active={customSel} blockPolice={blockPolice} onPick={(rgb) => onPick('custom', rgb)} />
      ) : null}
      {blockPolice ? <Text style={T.small}>Red and blue aren't offered here (they read as police lights).</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 4 },
  cell: { width: 72, alignItems: 'center', gap: 4, minHeight: 44 },
  ring: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  sw: { width: 44, height: 44, borderRadius: 22 },
  name: { color: C.muted, fontSize: 14, textAlign: 'center' },
});
