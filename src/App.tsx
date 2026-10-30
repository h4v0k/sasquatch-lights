import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useLightEngine } from './engine/useLightEngine';
import { ZONE_LABEL } from './model/modes';
import { useMotion } from './roadlock/useMotion';
import { useRegion } from './roadlock/useRegion';
import type { ZoneId } from './rules';
import { Builder } from './screens/Builder';
import { Devices } from './screens/Devices';
import { Garage, type GaragePage } from './screens/Garage';
import { MatchAll } from './screens/MatchAll';
import { Modes } from './screens/Modes';
import { RoadLock } from './screens/RoadLock';
import { ZoneScreen } from './screens/ZoneScreen';
import { useStore } from './store';
import { DRIVERS } from './protocol';
import { BleTransport } from './transport/ble';
import { autoAssignments, missingKnown } from './model/known';
import { Icon, type IconName } from './ui/parts';
import { C, S } from './ui/theme';

type Tab = 'garage' | 'modes' | 'devices';
type Route = { tab: Tab; zone?: ZoneId; page?: GaragePage; builder?: { editId?: string } };

export default function App() {
  const transport = useMemo(() => new BleTransport(), []);
  useRegion();
  useMotion();
  useLightEngine(transport);
  useKeepConnected(transport);
  useAutoAssignKnown(transport);

  const [route, setRoute] = useState<Route>({ tab: 'garage' });
  const back = route.zone || route.builder || route.page ? () => setRoute({ tab: route.tab }) : null;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (back) { back(); return true; }
      if (route.tab !== 'garage') { setRoute({ tab: 'garage' }); return true; }
      return false;
    });
    return () => sub.remove();
  }, [back, route.tab]);

  const title = route.zone ? ZONE_LABEL[route.zone]
    : route.page === 'lock' ? 'Road lock'
    : route.page === 'matchAll' ? 'One color'
    : route.builder ? (route.builder.editId ? 'Edit mode' : 'New mode')
    : route.tab === 'garage' ? 'Sasquatch Lights' : route.tab === 'modes' ? 'Modes' : 'Setup';

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
        <Header title={title} onBack={back} home={!back && route.tab === 'garage'} />
        <View style={{ flex: 1 }}>
          {route.zone ? (
            <ZoneScreen zone={route.zone} />
          ) : route.page === 'lock' ? (
            <RoadLock />
          ) : route.page === 'matchAll' ? (
            <MatchAll />
          ) : route.builder ? (
            <Builder editId={route.builder.editId} done={() => setRoute({ tab: 'modes' })} />
          ) : route.tab === 'garage' ? (
            <Garage openZone={(zone) => setRoute({ tab: 'garage', zone })} openPage={(page) => setRoute({ tab: 'garage', page })} openModes={() => setRoute({ tab: 'modes' })} />
          ) : route.tab === 'modes' ? (
            <Modes openBuilder={(editId) => setRoute({ tab: 'modes', builder: { editId } })} />
          ) : (
            <Devices transport={transport} />
          )}
        </View>
        <TabBar tab={route.tab} onPick={(tab) => setRoute({ tab })} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/**
 * On launch, quietly scans for the car's known controllers (src/model/known.ts) and assigns any that
 * aren't set up yet, so they never need labeling by hand. Stops once all are found or after 20s.
 */
function useAutoAssignKnown(transport: BleTransport) {
  useEffect(() => {
    let stop: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      const s = useStore.getState();
      if (s.lightsLocked || missingKnown(s.devices, s.skippedKnown).length === 0) return;
      const seen: { id: string; name: string | null }[] = [];
      stop = transport.scan((d) => {
        seen.push(d);
        const st = useStore.getState();
        for (const a of autoAssignments(seen, st.devices, st.skippedKnown)) st.assignDevice(a);
        if (missingKnown(useStore.getState().devices, useStore.getState().skippedKnown).length === 0) { stop?.(); stop = null; }
      });
      timer = setTimeout(() => { stop?.(); stop = null; }, 20000);
    };
    if (useStore.persist.hasHydrated()) run();
    const unsub = useStore.persist.onFinishHydration(run);
    return () => { unsub(); stop?.(); if (timer) clearTimeout(timer); };
  }, [transport]);
}

/** Keeps every assigned controller connected; drops the ones that get removed. */
function useKeepConnected(transport: BleTransport) {
  const devices = useStore((s) => s.devices);
  const ids = devices.map((d) => d.deviceId).sort().join('|');
  const prev = React.useRef(new Set<string>());
  useEffect(() => {
    const now = new Set(devices.map((d) => d.deviceId));
    const services = Array.from(new Set(DRIVERS.flatMap((x) => x.services)));
    for (const d of devices) {
      transport.rememberName(d.deviceId, d.name);
      if (!prev.current.has(d.deviceId)) void transport.connect(d.deviceId, services);
    }
    for (const id of prev.current) if (!now.has(id)) void transport.disconnect(id);
    prev.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, transport]);
}

function Header({ title, onBack, home }: { title: string; onBack: (() => void) | null; home: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, minHeight: 60 }}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', marginLeft: -10 }}>
          <Icon name="chevron-back" size={30} />
        </Pressable>
      ) : (
        <Image source={require('../assets/logo.png')} style={{ width: home ? 44 : 36, height: home ? 44 : 36 }} accessibilityIgnoresInvertColors accessible={false} />
      )}
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, color: C.text, fontSize: home ? 24 : 22, fontWeight: '800' }}>{title}</Text>
    </View>
  );
}

const TABS: { id: Tab; name: string; icon: IconName; on: IconName }[] = [
  { id: 'garage', name: 'Lights', icon: 'bulb-outline', on: 'bulb' },
  { id: 'modes', name: 'Modes', icon: 'color-palette-outline', on: 'color-palette' },
  { id: 'devices', name: 'Setup', icon: 'settings-outline', on: 'settings' },
];

function TabBar({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
      {TABS.map((t) => {
        const sel = tab === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onPick(t.id)}
            accessibilityRole="tab"
            accessibilityLabel={t.name}
            accessibilityState={{ selected: sel }}
            style={{ flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 }}
          >
            <Icon name={sel ? t.on : t.icon} size={24} color={sel ? C.accent : C.muted} />
            <Text style={{ color: sel ? C.accent : C.muted, fontSize: 14, fontWeight: '600' }}>{t.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
