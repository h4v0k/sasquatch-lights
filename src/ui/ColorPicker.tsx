import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hueToRgb, SWATCHES, toHex, type Rgb } from '../model/colors';
import type { ColorId } from '../rules';
import { C, T } from './theme';

const HUES = Array.from({ length: 12 }, (_, i) => i * 30);

/** Preset swatches plus a row of custom hues. `allowed` limits choices (road lock). */
export function ColorPicker({ value, custom, onPick, allowed, disabled }: {
  value: ColorId; custom: Rgb; onPick: (c: ColorId, custom?: Rgb) => void; allowed?: ColorId[]; disabled?: boolean;
}) {
  const canCustom = !disabled && (!allowed || allowed.includes('custom'));
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.grid}>
        {SWATCHES.map((s) => {
          const locked = disabled || (allowed ? !allowed.includes(s.id) : false);
          const sel = value === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={locked ? undefined : () => onPick(s.id)}
              accessibilityRole="button"
              accessibilityLabel={s.name + (locked ? ', not allowed here' : '')}
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
              const sel = value === 'custom' && toHex(custom) === toHex(rgb);
              return (
                <Pressable
                  key={h}
                  onPress={() => onPick('custom', rgb)}
                  accessibilityRole="button"
                  accessibilityLabel={`Custom hue ${h} degrees`}
                  accessibilityState={{ selected: sel }}
                  style={[styles.hue, { backgroundColor: toHex(rgb), borderColor: sel ? C.text : 'transparent' }]}
                />
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
