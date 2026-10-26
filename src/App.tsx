import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useLightEngine } from './engine/useLightEngine';
import { ZONE_LABEL } from './model/modes';
import { useRegion } from './roadlock/useRegion';
import type { ZoneId } from './rules';
import { Builder } from './screens/Builder';
import { Devices } from './screens/Devices';
import { Garage } from './screens/Garage';
import { Modes } from './screens/Modes';
import { ZoneScreen } from './screens/ZoneScreen';
import { useStore } from './store';
import { DRIVERS } from './protocol';
import { BleTransport } from './transport/ble';
import { autoAssignments, missingKnown } from './model/known';
import { C } from './ui/theme';

type Tab = 'garage' | 'modes' | 'devices';
type Route = { tab: Tab; zone?: ZoneId; builder?: { editId?: string } };

export default function App() {
  const transport = useMemo(() => new BleTransport(), []);
  useRegion();
  useLightEngine(transport);
  useKeepConnected(transport);
  useAutoAssignKnown(transport);

  const [route, setRoute] = useState<Route>({ tab: 'garage' });
  const back = route.zone || route.builder ? () => setRoute({ tab: route.tab }) : null;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (back) { back(); return true; }
      if (route.tab !== 'garage') { setRoute({ tab: 'garage' }); return true; }
      return false;
    });
    return () => sub.remove();
  }, [back, route.tab]);

  const title = route.zone ? ZONE_LABEL[route.zone] : route.builder ? (route.builder.editId ? 'Edit mode' : 'Build a mode') : route.tab === 'garage' ? 'Sasquatch Lights' : route.tab === 'modes' ? 'Modes' : 'Devices';

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right', 'bottom']}>
        <Header title={title} onBack={back} />
        <View style={{ flex: 1 }}>
          {route.zone ? (
            <ZoneScreen zone={route.zone} />
          ) : route.builder ? (
            <Builder editId={route.builder.editId} done={() => setRoute({ tab: 'modes' })} />
          ) : route.tab === 'garage' ? (
            <Garage openZone={(zone) => setRoute({ tab: 'garage', zone })} openModes={() => setRoute({ tab: 'modes' })} />
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
      if (missingKnown(s.devices, s.skippedKnown).length === 0) return;
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

function Header({ title, onBack }: { title: string; onBack: (() => void) | null }) {
  const s = useStore();
  const on = s.roadLock;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' }}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', marginLeft: -8 }}>
          <Text style={{ color: C.text, fontSize: 30 }}>‹</Text>
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 }}>{title}</Text>
      <View
        accessibilityLabel={on ? 'Road lock on' : 'Road lock off'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? C.ok : C.accent, backgroundColor: on ? C.okBg : C.warnBg }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? C.ok : C.warn }} />
        <Text style={{ color: on ? C.okText : C.warnText, fontSize: 15, fontWeight: '600' }}>{on ? 'Road lock on' : 'Road lock off'}</Text>
      </View>
    </View>
  );
}

function TabBar({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  const tabs: { id: Tab; name: string }[] = [{ id: 'garage', name: 'Garage' }, { id: 'modes', name: 'Modes' }, { id: 'devices', name: 'Devices' }];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#121315' }}>
      {tabs.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onPick(t.id)}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === t.id }}
          style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: tab === t.id ? C.accent : C.muted, fontSize: 16, fontWeight: '700' }}>{t.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
