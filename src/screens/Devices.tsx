import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { driverFor } from '../engine/packets';
import { ZONE_LABEL, ZONES } from '../model/modes';
import { DRIVERS } from '../protocol';
import { rulesFor, type ZoneId } from '../rules';
import { OVERRIDE_CHOICES_MIN } from '../roadlock/lock';
import { isDriving, overrideActive, useStore } from '../store';
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
  const [ovMin, setOvMin] = useState<number>(60);
  const [ovConfirm, setOvConfirm] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const rules = rulesFor(s.regionCode);
  const demo = transport.kind === 'demo' ? (transport as DemoTransport) : null;
  const driving = isDriving(s);

  useEffect(() => (demo ? demo.onLog(bump) : undefined), [demo]);

  const scan = () => {
    setFound([]);
    setScanning(true);
    const stop = transport.scan((d) => setFound((f) => (f.some((x) => x.id === d.id) ? f : [...f, d])));
    setTimeout(() => { stop(); setScanning(false); }, 8000);
  };

  const gpsText = { starting: 'Waiting for a fix: lock on', ok: s.background ? 'On, also with the screen off' : 'On while the app is open', stale: 'Lost signal: lock on', denied: 'Location permission off: lock on', unavailable: 'Location off: lock on' }[s.gps];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
      {demo ? <Notice kind="info" text="Demo mode: Bluetooth is not wired up yet. Commands are shown in the log below instead of going to the lights." /> : null}
      {driving ? <Notice text="Controller changes are locked while the Road lock is on. Park to add, move or remove a controller." /> : null}

      <Section title="Controllers" right={<Btn label={scanning ? 'Scanning…' : 'Scan'} onPress={scan} disabled={scanning || driving} style={{ minHeight: 44 }} />}>
        {s.devices.length === 0 ? <Text style={T.sub}>No controllers assigned. Scan, then pick which light each one runs.</Text> : null}
        {s.devices.map((d) => (
          <View key={d.deviceId} style={[T.card, { padding: 14, gap: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text style={T.strong}>{ZONE_LABEL[d.zone]}</Text>
              <Text style={T.sub}>{d.name ?? d.deviceId}</Text>
            </View>
            <Pressable onPress={driving ? undefined : () => setDriverPickFor(driverPickFor === d.deviceId ? null : d.deviceId)} accessibilityRole="button" accessibilityState={{ disabled: driving }} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={T.body}>Protocol: <Text style={{ color: C.accent }}>{driverFor(d).label}</Text></Text>
            </Pressable>
            {driverPickFor === d.deviceId && !driving ? (
              <View style={{ gap: 6 }}>
                {DRIVERS.map((dr) => (
                  <Btn key={dr.id} label={dr.label} kind={driverFor(d).id === dr.id ? 'chipOn' : 'chip'} onPress={() => { s.setDriver(d.deviceId, dr.id); setDriverPickFor(null); }} />
                ))}
              </View>
            ) : null}
            <Btn label="Remove" onPress={() => s.unassignDevice(d.deviceId)} disabled={driving} />
          </View>
        ))}
        {found.filter((f) => !s.devices.some((d) => d.deviceId === f.id)).map((f) => (
          <View key={f.id} style={[T.card, { padding: 14, gap: 10 }]}>
            <Text style={T.strong}>{f.name ?? 'Unnamed device'}</Text>
            <Text style={T.sub}>Signal {f.rssi ?? '?'} dBm</Text>
            {pickZoneFor?.id === f.id && !driving ? (
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
              <Btn label="Assign to a light" onPress={() => setPickZoneFor(f)} disabled={driving} />
            )}
          </View>
        ))}
      </Section>

      <Section title="Road lock">
        <View style={T.card}>
          <Row k="Region" v={s.regionCode ? `${rules.region} · from GPS` : 'Unknown: strictest rules'} />
          <Row k="GPS" v={gpsText} />
          <Row k="Counts as driving" v="Over 5 mph, until stopped for 90 seconds" />
          {ZONES.map((z) => <Row key={z} k={ZONE_LABEL[z]} v={rules.zones[z].note} />)}
          <Text style={[T.small, { padding: 14, lineHeight: 20 }]}>
            Based on our reading of {rules.cite}. Not legal advice; verify before relying on it. No Florida statute covers underglow, so that rule is a cautious guess.
          </Text>
        </View>
        <View style={[T.card, { padding: 14, gap: 12 }]}>
          <Text style={T.strong}>Parade override</Text>
          {overrideActive(s) ? (
            <>
              <Text style={T.sub}>On until {new Date(s.override!.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Ends on its own at that time.</Text>
              <Btn label="End override" kind="primary" onPress={s.endOverride} />
            </>
          ) : (
            <>
              <Text style={T.sub}>Lifts the Road lock for a parade or closed course, at any speed. Ends on its own when the time runs out. Red and blue stay off the front lights.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {OVERRIDE_CHOICES_MIN.map((m) => (
                  <Btn key={m} label={m < 60 ? `${m} min` : `${m / 60} hr`} kind={ovMin === m ? 'chipOn' : 'chip'} onPress={() => setOvMin(m)} style={{ flex: 1 }} />
                ))}
              </View>
              {driving ? (
                <Text style={T.sub}>Park first: the override can only start while stopped with GPS.</Text>
              ) : ovConfirm ? (
                <>
                  <Notice text="You're turning off the Road lock. Staying within the law is on you until it ends." />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn label="Start override" kind="primary" onPress={() => { s.startOverride(ovMin); setOvConfirm(false); }} style={{ flex: 1 }} />
                    <Btn label="Cancel" onPress={() => setOvConfirm(false)} style={{ flex: 1 }} />
                  </View>
                </>
              ) : (
                <Btn label="Start parade override" onPress={() => setOvConfirm(true)} />
              )}
            </>
          )}
        </View>
        <ToggleRow title="Simulate driving" sub={`Turns the lock on for testing. Now: ${isDriving(s) ? 'driving' : 'parked'}`} value={s.simulateDriving} onChange={s.setSimulateDriving} />
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
