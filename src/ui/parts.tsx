import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, S, T } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function Btn({ label, onPress, kind = 'plain', disabled, style, a11y, icon }: {
  label: string; onPress: () => void; kind?: 'plain' | 'primary' | 'chip' | 'chipOn' | 'quiet' | 'danger';
  disabled?: boolean; style?: ViewStyle; a11y?: string; icon?: IconName;
}) {
  const filled = kind === 'primary' || kind === 'chipOn';
  const fg = filled ? C.onAccent : kind === 'danger' ? C.danger : kind === 'quiet' ? C.muted : C.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled, selected: kind === 'chipOn' }}
      style={({ pressed }) => [
        styles.btn,
        kind.startsWith('chip') && styles.chip,
        filled ? styles.primary : kind === 'quiet' || kind === 'danger' ? styles.quiet : styles.plain,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** iOS-style switch drawn in JS so it looks the same on both phones. */
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      hitSlop={8}
      style={{ minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
    >
      <View style={[styles.track, { backgroundColor: value ? C.ok : C.line2, alignItems: value ? 'flex-end' : 'flex-start' }]}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}

export function ToggleRow({ title, sub, value, onChange, disabled }: {
  title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={[T.card, styles.row]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.strong}>{title}</Text>
        {sub ? <Text style={T.sub}>{sub}</Text> : null}
      </View>
      <Toggle value={value} onChange={onChange} disabled={disabled} label={title} />
    </View>
  );
}

/** Tappable row that opens another screen. */
export function NavRow({ icon, iconColor, title, sub, onPress, a11y }: {
  icon?: IconName; iconColor?: string; title: string; sub?: string; onPress: () => void; a11y?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? title}
      style={({ pressed }) => [T.card, styles.row, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} color={iconColor ?? C.muted} size={24} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.strong}>{title}</Text>
        {sub ? <Text style={T.sub}>{sub}</Text> : null}
      </View>
      <Icon name="chevron-forward" color={C.muted} size={20} />
    </Pressable>
  );
}

export function Notice({ text, kind = 'warn' }: { text: string; kind?: 'warn' | 'ok' | 'info' }) {
  const k = kind === 'ok' ? { bg: C.okBg, line: C.okLine, fg: C.okText, icon: 'checkmark-circle' as const, ic: C.ok }
    : kind === 'warn' ? { bg: C.warnBg, line: C.warnLine, fg: C.warnText, icon: 'shield-checkmark' as const, ic: C.warn }
    : { bg: C.surface2, line: C.line2, fg: C.text, icon: 'information-circle' as const, ic: C.muted };
  return (
    <View accessibilityRole="text" style={[styles.notice, { backgroundColor: k.bg, borderColor: k.line }]}>
      <Icon name={k.icon} color={k.ic} size={20} />
      <Text style={{ color: k.fg, fontSize: 16, lineHeight: 22, flex: 1 }}>{text}</Text>
    </View>
  );
}

/** A titled group. `hint` is one plain line saying what the controls below change. */
export function Section({ title, hint, children, right }: { title: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: S.md }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: S.sm }}>
          <Text style={T.h2} accessibilityRole="header">{title}</Text>
          {right}
        </View>
        {hint ? <Text style={T.sub}>{hint}</Text> : null}
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

/** Label/value line for detail lists. */
export function KV({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line, flexWrap: 'wrap' }}>
      <Text style={T.sub}>{k}</Text>
      <Text style={[T.body, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 50, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 999, minHeight: 44, paddingHorizontal: 18 },
  plain: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line2 },
  primary: { backgroundColor: C.accent, borderWidth: 1, borderColor: C.accent },
  quiet: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  btnText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg, minHeight: 64 },
  notice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3 },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.text },
});
