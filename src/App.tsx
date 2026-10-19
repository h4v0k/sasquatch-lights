import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useLightEngine } from './engine/useLightEngine';
import { ZONE_LABEL } from './model/modes';
import { useRoadLock } from './roadlock/useRoadLock';
import type { ZoneId } from './rules';
import { Builder } from './screens/Builder';
import { Devices } from './screens/Devices';
import { Garage } from './screens/Garage';
import { Modes } from './screens/Modes';
import { ZoneScreen } from './screens/ZoneScreen';
import { isDriving, useStore } from './store';
import { DemoTransport } from './transport/demo';
import { C } from './ui/theme';

type Tab = 'garage' | 'modes' | 'devices';
type Route = { tab: Tab; zone?: ZoneId; builder?: { editId?: string } };

export default function App() {
  // Swap DemoTransport for the Bluetooth transport once protocols are confirmed (see docs/PLAN.md).
  const transport = useMemo(() => new DemoTransport(), []);
  useRoadLock();
  useLightEngine(transport);

  const [route, setRoute] = useState<Route>({ tab: 'garage' });
  const back = route.zone || route.builder ? () => setRoute({ tab: route.tab }) : null;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (back) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [back]);

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

function Header({ title, onBack }: { title: string; onBack: (() => void) | null }) {
  const s = useStore();
  const driving = isDriving(s);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' }}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', marginLeft: -8 }}>
          <Text style={{ color: C.text, fontSize: 30 }}>‹</Text>
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 }}>{title}</Text>
      <View
        accessibilityLabel={driving ? 'Driving, road lock on' : 'Parked'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: driving ? C.accent : C.line, backgroundColor: driving ? C.warnBg : C.surface }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: driving ? C.warn : C.ok }} />
        <Text style={{ color: driving ? C.warnText : C.text, fontSize: 15, fontWeight: '600' }}>{driving ? 'Road lock on' : 'Parked'}</Text>
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
