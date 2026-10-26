import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SWATCHES, toHex, type Rgb } from '../model/colors';
import { isPoliceColor } from '../model/modes';
import type { ColorId } from '../rules';
import { ColorWheel } from './ColorWheel';
import { C, T } from './theme';

/**
 * Preset swatches plus a color wheel for any custom color. `allowed` limits choices (Road lock rules);
 * `blockPolice` hides red and blue (always on for front-facing zones).
 */
export function ColorPicker({ value, custom, onPick, allowed, disabled, blockPolice }: {
  value: ColorId; custom: Rgb; onPick: (c: ColorId, custom?: Rgb) => void; allowed?: ColorId[]; disabled?: boolean; blockPolice?: boolean;
}) {
  const canCustom = !disabled && (!allowed || allowed.includes('custom'));
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.grid}>
        {SWATCHES.map((s) => {
          const locked = disabled || (allowed ? !allowed.includes(s.id) : false) || (!!blockPolice && isPoliceColor(s.rgb));
          const sel = value === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={locked ? undefined : () => onPick(s.id)}
              accessibilityRole="button"
              accessibilityLabel={s.name + (locked ? (blockPolice && isPoliceColor(s.rgb) ? ', red and blue are blocked on front lights' : ', not allowed here') : '')}
              accessibilityState={{ selected: sel, disabled: locked }}
              style={[styles.sw, { backgroundColor: locked ? C.surface : toHex(s.rgb), borderColor: sel ? C.text : locked ? toHex(s.rgb) + '66' : 'transparent' }]}
            >
              {locked ? <Text style={styles.lock}>×</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {canCustom ? (
        <View style={{ gap: 8 }}>
          <Text style={T.sub}>Any color</Text>
          <ColorWheel value={custom} active={value === 'custom'} blockPolice={blockPolice} onPick={(rgb) => onPick('custom', rgb)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sw: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  lock: { color: C.muted, fontSize: 22, fontWeight: '700' },
});
