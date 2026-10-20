import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { driverFor } from '../engine/packets';
import { ZONE_LABEL, ZONES } from '../model/modes';
import { DRIVERS } from '../protocol';
import { rulesFor, type ZoneId } from '../rules';
import { useStore } from '../store';
import type { DemoTransport } from '../transport/demo';
import type { FoundDevice, LightTransport } from '../transport/types';
import { Btn, Notice, Section, ToggleRow } from '../ui/parts';
import { C, T } from '../ui/theme';

export function Devices({ transport }: { transport: LightTransport }) {
  const s = useStore();
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [pickZoneFor, setPickZoneFor] = useState<FoundDevice | null>(null);
  const [driverPickFor, setDriverPickFor] = useState<string | null>(null);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const rules = rulesFor(s.regionCode);
  const demo = transport.kind === 'demo' ? (transport as DemoTransport) : null;

  useEffect(() => (demo ? demo.onLog(bump) : undefined), [demo]);

  const scan = () => {
    setFound([]);
    setScanning(true);
    const stop = transport.scan((d) => setFound((f) => (f.some((x) => x.id === d.id) ? f : [...f, d])));
    setTimeout(() => { stop(); setScanning(false); }, 8000);
  };

  const locText = { starting: 'Finding your state', ok: 'On', denied: 'Permission off', unavailable: 'Off or no signal' }[s.location];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      {demo ? <Notice kind="info" text="Demo mode: Bluetooth is not wired up yet. Commands are shown in the log below instead of going to the lights." /> : null}

      <Section title="Controllers" right={<Btn label={scanning ? 'Scanning…' : 'Scan'} onPress={scan} disabled={scanning} style={{ minHeight: 44 }} />}>
        {s.devices.length === 0 ? <Text style={T.sub}>No controllers assigned. Scan, then pick which light each one runs.</Text> : null}
        {s.devices.map((d) => (
          <View key={d.deviceId} style={[T.card, { padding: 14, gap: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text style={T.strong}>{ZONE_LABEL[d.zone]}</Text>
              <Text style={T.sub}>{d.name ?? d.deviceId}</Text>
            </View>
            <Pressable onPress={() => setDriverPickFor(driverPickFor === d.deviceId ? null : d.deviceId)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={T.body}>Protocol: <Text style={{ color: C.accent }}>{driverFor(d).label}</Text></Text>
            </Pressable>
            {driverPickFor === d.deviceId ? (
              <View style={{ gap: 6 }}>
                {DRIVERS.map((dr) => (
                  <Btn key={dr.id} label={dr.label} kind={driverFor(d).id === dr.id ? 'chipOn' : 'chip'} onPress={() => { s.setDriver(d.deviceId, dr.id); setDriverPickFor(null); }} />
                ))}
              </View>
            ) : null}
            <Btn label="Remove" onPress={() => s.unassignDevice(d.deviceId)} />
          </View>
        ))}
        {found.filter((f) => !s.devices.some((d) => d.deviceId === f.id)).map((f) => (
          <View key={f.id} style={[T.card, { padding: 14, gap: 10 }]}>
            <Text style={T.strong}>{f.name ?? 'Unnamed device'}</Text>
            <Text style={T.sub}>Signal {f.rssi ?? '?'} dBm</Text>
            {pickZoneFor?.id === f.id ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ZONES.map((z: ZoneId) => (
                  <Btn key={z} label={ZONE_LABEL[z]} kind="chip" onPress={async () => {
                    s.assignDevice({ deviceId: f.id, name: f.name, zone: z });
                    setPickZoneFor(null);
                    try { await transport.connect(f.id, DRIVERS.flatMap((x) => x.services)); } catch { /* shown via link state later */ }
                  }} />
                ))}
              </View>
            ) : (
              <Btn label="Assign to a light" onPress={() => setPickZoneFor(f)} />
            )}
          </View>
        ))}
      </Section>

      <Section title="Road lock">
        <ToggleRow title="Road lock" sub={s.roadLock ? 'On' : 'Off: any color except red or blue up front'} value={s.roadLock} onChange={s.setRoadLock} />
        <View style={T.card}>
          <Row k="State" v={rules ? `${rules.region} · from location` : s.regionCode ? `${s.regionCode}: no rule set yet` : 'Unknown'} />
          <Row k="Location" v={locText} />
          <Row k="Always" v="No red or blue (incl. ice blue) on headlights, grille or underglow" />
          {rules ? ZONES.map((z) => <Row key={z} k={ZONE_LABEL[z]} v={rules.zones[z].note} />) : <Row k="With the lock on" v="No other limits until there's a rule set for your state" />}
          <Text style={[T.sub, { padding: 14, lineHeight: 22 }]}>
            {rules ? `Based on our reading of ${rules.cite}. ` : ''}Not legal advice; verify before relying on it. No Florida statute covers underglow, so that rule is a cautious guess. To find your state, your coordinates go to the phone's geocoder (Google on Android); only the state is kept.
          </Text>
        </View>
      </Section>

      {demo ? (
        <Section title="Command log">
          <View style={[T.card, { padding: 12, gap: 4 }]}>
            {demo.log.length === 0 ? <Text style={T.sub}>Nothing sent yet. Assign a controller and change a light.</Text> : null}
            {demo.log.slice(0, 20).map((p, i) => (
              <Text key={i} style={{ color: C.text, fontSize: 14, fontFamily: 'monospace' }}>
                {(s.devices.find((d) => d.deviceId === p.deviceId)?.zone ?? p.deviceId)} {p.char} ← {p.hex}
              </Text>
            ))}
          </View>
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.line, flexWrap: 'wrap' }}>
      <Text style={T.sub}>{k}</Text>
      <Text style={[T.strong, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
    </View>
  );
}
