import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';
import { C, T } from './theme';

export function Btn({ label, onPress, kind = 'plain', disabled, style, a11y }: {
  label: string; onPress: () => void; kind?: 'plain' | 'primary' | 'chip' | 'chipOn'; disabled?: boolean; style?: ViewStyle; a11y?: string;
}) {
  const s = kind === 'primary' || kind === 'chipOn' ? styles.primary : styles.plain;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled, selected: kind === 'chipOn' }}
      style={({ pressed }) => [styles.btn, kind.startsWith('chip') && styles.chip, s, disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}
    >
      <Text style={[styles.btnText, (kind === 'primary' || kind === 'chipOn') && { color: C.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

export function ToggleRow({ title, sub, value, onChange, disabled }: {
  title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={[T.card, styles.toggleRow]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.strong}>{title}</Text>
        {sub ? <Text style={T.sub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={title}
        trackColor={{ true: C.ok, false: C.line2 }}
        thumbColor={C.text}
      />
    </View>
  );
}

export function Notice({ text, kind = 'warn' }: { text: string; kind?: 'warn' | 'ok' | 'info' }) {
  const k = kind === 'ok' ? { bg: C.okBg, line: C.okLine, fg: C.okText } : kind === 'warn' ? { bg: C.warnBg, line: C.warnLine, fg: C.warnText } : { bg: C.surface2, line: C.line2, fg: C.text };
  return (
    <View accessibilityRole="text" style={[styles.notice, { backgroundColor: k.bg, borderColor: k.line }]}>
      <Text style={{ color: k.fg, fontSize: 16, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Text style={T.h2} accessibilityRole="header">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Dot({ color, size = 22 }: { color: string | null; size?: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color ?? 'transparent', borderWidth: 2, borderColor: color ?? C.line2,
        shadowColor: color ?? 'transparent', shadowOpacity: color ? 0.9 : 0, shadowRadius: 8, elevation: color ? 4 : 0,
      }}
    />
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 999, minHeight: 44 },
  plain: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  primary: { backgroundColor: C.accent, borderWidth: 1, borderColor: C.accent },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  btnText: { color: C.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, minHeight: 64 },
  notice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
