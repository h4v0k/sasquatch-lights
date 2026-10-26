import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { driverFor } from '../engine/packets';
import { ZONE_LABEL, ZONES } from '../model/modes';
import { DRIVERS } from '../protocol';
import { rulesFor, type ZoneId } from '../rules';
import { useStore } from '../store';
import { knownFor } from '../model/known';
import type { FoundDevice, LightTransport, LinkState } from '../transport/types';
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
  const demo = transport.kind === 'demo';
  const [scanError, setScanError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => transport.onLog(bump), [transport]);
  useEffect(() => transport.onState(() => bump()), [transport]);

  const scan = () => {
    setFound([]);
    setScanError(null);
    setScanning(true);
    const stop = transport.scan(
      (d) => setFound((f) => (f.some((x) => x.id === d.id) ? f : [...f, d])),
      (msg) => { setScanError(msg); setScanning(false); },
    );
    setTimeout(() => { stop(); setScanning(false); }, 10000);
  };

  // Known controllers first, then anything with a name, unnamed last.
  const unassigned = found
    .filter((f) => !s.devices.some((d) => d.deviceId === f.id))
    .sort((a, b) => Number(!!knownFor(b.name)) - Number(!!knownFor(a.name)) || Number(!!b.name) - Number(!!a.name));
  const knownWaiting = unassigned.filter((f) => knownFor(f.name));

  const locText = { starting: 'Finding your state', ok: 'On', denied: 'Permission off', unavailable: 'Off or no signal' }[s.location];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      {demo ? <Notice kind="info" text="Demo mode: commands go to the log instead of the lights." /> : null}
      {scanError ? <Notice kind="warn" text={scanError} /> : null}

      <Section title="Controllers" right={<Btn label={scanning ? 'Scanning…' : 'Scan'} onPress={scan} disabled={scanning} style={{ minHeight: 44 }} />}>
        {s.devices.length === 0 ? <Text style={T.sub}>No controllers assigned. Scan, then pick which light each one runs.</Text> : null}
        {s.devices.map((d) => (
          <View key={d.deviceId} style={[T.card, { padding: 14, gap: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text style={T.strong}>{knownFor(d.name)?.label ?? ZONE_LABEL[d.zone]}</Text>
              <LinkPill state={transport.stateOf(d.deviceId)} />
            </View>
            <Text style={T.sub}>{d.name ?? d.deviceId}</Text>
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
        {knownWaiting.length > 1 ? (
          <Btn label={`Add all ${knownWaiting.length} of your lights`} kind="primary" onPress={() => {
            for (const f of knownWaiting) s.assignDevice({ deviceId: f.id, name: f.name, zone: knownFor(f.name)!.zone });
          }} />
        ) : null}
        {unassigned.map((f) => (
          <View key={f.id} style={[T.card, { padding: 14, gap: 10 }]}>
            <Text style={T.strong}>{f.name ?? 'Unnamed device'}</Text>
            <Text style={T.sub}>{knownFor(f.name) ? `Your ${knownFor(f.name)!.label.toLowerCase()} · ` : ''}Signal {f.rssi ?? '?'} dBm</Text>
            {knownFor(f.name) && pickZoneFor?.id !== f.id ? (
              <Btn label={`Add as ${knownFor(f.name)!.label}`} kind="primary" onPress={() => s.assignDevice({ deviceId: f.id, name: f.name, zone: knownFor(f.name)!.zone })} />
            ) : null}
            {pickZoneFor?.id === f.id ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ZONES.map((z: ZoneId) => (
                  <Btn key={z} label={ZONE_LABEL[z]} kind="chip" onPress={() => {
                    s.assignDevice({ deviceId: f.id, name: f.name, zone: z });
                    setPickZoneFor(null);
                  }} />
                ))}
              </View>
            ) : (
              <Btn label={knownFor(f.name) ? 'Assign to a different light' : 'Assign to a light'} onPress={() => setPickZoneFor(f)} />
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

      <Section title="Activity log" right={<Btn label={showLog ? 'Hide' : 'Show'} onPress={() => setShowLog(!showLog)} style={{ minHeight: 44 }} />}>
        {showLog ? (
          <View style={[T.card, { padding: 12, gap: 4 }]}>
            {transport.log.length === 0 ? <Text style={T.sub}>Nothing yet.</Text> : null}
            {transport.log.slice(0, 40).map((p, i) => (
              <Text key={i} style={{ color: C.text, fontSize: 14, fontFamily: 'monospace' }}>
                {new Date(p.at).toLocaleTimeString()}  {p.text}
              </Text>
            ))}
          </View>
        ) : null}
      </Section>
    </ScrollView>
  );
}

const PILL: Record<LinkState, { text: string; color: string }> = {
  connected: { text: 'Connected', color: C.ok },
  connecting: { text: 'Connecting', color: C.warn },
  disconnected: { text: 'Not connected', color: C.muted },
  error: { text: 'Retrying', color: C.warn },
};

function LinkPill({ state }: { state: LinkState }) {
  const p = PILL[state];
  return (
    <View accessibilityLabel={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
      <Text style={[T.body, { color: p.color }]}>{p.text}</Text>
    </View>
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
