import { StyleSheet } from 'react-native';

// Dark garage palette: bronze accent (the badges), olive greens from the sasquatch logo.
export const C = {
  bg: '#0B0C0D',
  surface: '#16181A',
  surface2: '#1F2225',
  line: '#26292D',
  line2: '#383D43',
  text: '#F2EFE8',
  muted: '#9DA3AA',
  accent: '#D9944E',
  accentSoft: '#2B1F14',
  onAccent: '#15120E',
  ok: '#A9C24E',
  okBg: '#182010',
  okLine: '#3D4D1C',
  okText: '#D9E8B0',
  warn: '#FFB21E',
  warnBg: '#271F13',
  warnLine: '#5E4220',
  warnText: '#F5D7B2',
  danger: '#E5684F',
};

/** Spacing scale; screens use these instead of one-off numbers. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Sizes assume the user runs enlarged text: nothing under 14, body 17, targets >= 44.
export const T = StyleSheet.create({
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  h2: { color: C.text, fontSize: 19, fontWeight: '700' },
  body: { color: C.text, fontSize: 17 },
  strong: { color: C.text, fontSize: 17, fontWeight: '600' },
  sub: { color: C.muted, fontSize: 16, lineHeight: 22 },
  small: { color: C.muted, fontSize: 14 },
  card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 16 },
});
