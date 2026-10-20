import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hueToRgb, SWATCHES, toHex, type Rgb } from '../model/colors';
import { isPoliceColor } from '../model/modes';
import type { ColorId } from '../rules';
import { C, T } from './theme';

const HUES = Array.from({ length: 12 }, (_, i) => i * 30);

/**
 * Preset swatches plus a row of custom hues. `allowed` limits choices (Road lock rules);
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
          <Text style={T.sub}>Custom</Text>
          <View style={styles.hues}>
            {HUES.map((h) => {
              const rgb = hueToRgb(h);
              const blocked = !!blockPolice && isPoliceColor(rgb);
              const sel = value === 'custom' && toHex(custom) === toHex(rgb);
              return (
                <Pressable
                  key={h}
                  onPress={blocked ? undefined : () => onPick('custom', rgb)}
                  accessibilityRole="button"
                  accessibilityLabel={`Custom hue ${h} degrees${blocked ? ', red and blue are blocked on front lights' : ''}`}
                  accessibilityState={{ selected: sel, disabled: blocked }}
                  style={[styles.hue, { alignItems: 'center', justifyContent: 'center', backgroundColor: blocked ? C.surface : toHex(rgb), borderColor: sel ? C.text : blocked ? toHex(rgb) + '66' : 'transparent' }]}
                >
                  {blocked ? <Text style={styles.lock}>×</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sw: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  lock: { color: C.muted, fontSize: 22, fontWeight: '700' },
  hues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hue: { width: 44, height: 44, borderRadius: 10, borderWidth: 3 },
});
