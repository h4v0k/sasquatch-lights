import { StyleSheet } from 'react-native';

export const C = {
  bg: '#0E0F10',
  surface: '#17191B',
  surface2: '#202326',
  line: '#2C3035',
  line2: '#3A3F45',
  text: '#F2EFE8',
  muted: '#A7ADB4',
  accent: '#D9944E',
  onAccent: '#15120E',
  ok: '#A9C24E',
  okBg: '#1A2112',
  okLine: '#45561F',
  okText: '#D9E8B0',
  warn: '#FFB21E',
  warnBg: '#2A2215',
  warnLine: '#6B4A22',
  warnText: '#F5D7B2',
};

// Sizes assume the user runs enlarged text: nothing under 14, body 17, targets >= 44.
export const T = StyleSheet.create({
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  h2: { color: C.muted, fontSize: 15, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  body: { color: C.text, fontSize: 17 },
  strong: { color: C.text, fontSize: 17, fontWeight: '600' },
  sub: { color: C.muted, fontSize: 16 },
  small: { color: C.muted, fontSize: 14 },
  card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 14 },
});
