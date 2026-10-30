import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { driverFor } from '../engine/packets';
import { knownFor } from '../model/known';
import { ZONE_LABEL, ZONES } from '../model/modes';
import { DRIVERS } from '../protocol';
import { type ZoneId } from '../rules';
import { useStore } from '../store';
import type { FoundDevice, LightTransport, LinkState } from '../transport/types';
import { Btn, Icon, Notice, Section } from '../ui/parts';
import { C, S, T } from '../ui/theme';

/** Setup: which Bluetooth controller runs which light, pairing lock, and the log for troubleshooting. */
export function Devices({ transport }: { transport: LightTransport }) {
  const s = useStore();
  const [found, setFound] = useState<FoundDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [pickZoneFor, setPickZoneFor] = useState<FoundDevice | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [, bump] = useReducer((x: number) => x + 1, 0);
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
  const connected = s.devices.filter((d) => transport.stateOf(d.deviceId) === 'connected').length;

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: S.xxl }}>
      {demo ? <Notice kind="info" text="Demo mode: commands go to the log instead of the lights." /> : null}
      {scanError ? <Notice kind="warn" text={scanError} /> : null}

      <Section
        title="Your lights"
        hint={s.devices.length ? `${connected} of ${s.devices.length} connected.` : 'Scan to find the light controllers in the car, then add them.'}
      >
        {s.devices.length ? (
          <View style={T.card}>
            {s.devices.map((d, i) => {
              const open = details === d.deviceId;
              return (
                <View key={d.deviceId} style={{ borderBottomWidth: i === s.devices.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                  <Pressable
                    onPress={() => setDetails(open ? null : d.deviceId)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg, minHeight: 64 }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={T.strong}>{knownFor(d.name)?.label ?? ZONE_LABEL[d.zone]}</Text>
                      <LinkLine state={transport.stateOf(d.deviceId)} />
                    </View>
                    <Icon name={open ? 'chevron-up' : 'chevron-down'} color={C.muted} size={20} />
                  </Pressable>
                  {open ? (
                    <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg, gap: S.md }}>
                      <Text style={T.sub}>Bluetooth name: {d.name ?? d.deviceId}</Text>
                      <Text style={T.sub}>Runs: {ZONE_LABEL[d.zone]}</Text>
                      <Text style={T.sub}>Command set (change only if the light ignores the app):</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                        {DRIVERS.map((dr) => (
                          <Btn key={dr.id} label={dr.label} kind={driverFor(d).id === dr.id ? 'chipOn' : 'chip'} onPress={() => s.setDriver(d.deviceId, dr.id)} />
                        ))}
                      </View>
                      {s.lightsLocked ? null : <Btn label="Remove this light" kind="danger" icon="trash-outline" onPress={() => s.unassignDevice(d.deviceId)} />}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {s.lightsLocked ? (
          <>
            <Notice kind="ok" text="Pairing is locked. The app only connects to these lights and never scans for others." />
            <Btn label="Unlock to add or change lights" icon="lock-open-outline" onPress={() => s.setLightsLocked(false)} />
          </>
        ) : (
          <>
            <Btn label={scanning ? 'Scanning…' : 'Scan for lights'} icon="bluetooth" onPress={scan} disabled={scanning} />
            {s.devices.length > 0 ? (
              <Btn
                label={`Lock pairing to these ${s.devices.length}`}
                kind="primary"
                icon="lock-closed"
                onPress={() => { setFound([]); s.setLightsLocked(true); }}
                a11y={`Lock pairing to these ${s.devices.length} lights`}
              />
            ) : null}
          </>
        )}
      </Section>

      {!s.lightsLocked && unassigned.length ? (
        <Section title="Found nearby" hint="Add the ones that belong to your car.">
          {knownWaiting.length > 1 ? (
            <Btn label={`Add all ${knownWaiting.length} of your lights`} kind="primary" onPress={() => {
              for (const f of knownWaiting) s.assignDevice({ deviceId: f.id, name: f.name, zone: knownFor(f.name)!.zone });
            }} />
          ) : null}
          {unassigned.map((f) => {
            const k = knownFor(f.name);
            return (
              <View key={f.id} style={[T.card, { padding: S.lg, gap: S.md }]}>
                <View style={{ gap: 2 }}>
                  <Text style={T.strong}>{k ? k.label : f.name ?? 'Unnamed device'}</Text>
                  <Text style={T.sub}>{k ? `${f.name} · ` : ''}signal {f.rssi ?? '?'} dBm</Text>
                </View>
                {pickZoneFor?.id === f.id ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                    {ZONES.map((z: ZoneId) => (
                      <Btn key={z} label={ZONE_LABEL[z]} kind="chip" onPress={() => {
                        s.assignDevice({ deviceId: f.id, name: f.name, zone: z });
                        setPickZoneFor(null);
                      }} />
                    ))}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                    {k ? <Btn label={`Add as ${k.label}`} kind="primary" onPress={() => s.assignDevice({ deviceId: f.id, name: f.name, zone: k.zone })} style={{ flexGrow: 1 }} /> : null}
                    <Btn label={k ? 'Other light' : 'Add as…'} onPress={() => setPickZoneFor(f)} style={{ flexGrow: 1 }} />
                  </View>
                )}
              </View>
            );
          })}
        </Section>
      ) : null}

      <Section title="Troubleshooting" hint="Every command the app sends. Share it if a light misbehaves.">
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Btn label={showLog ? 'Hide log' : 'Show log'} icon="list-outline" onPress={() => setShowLog(!showLog)} style={{ flex: 1 }} />
          <Btn
            label="Share"
            icon="share-outline"
            onPress={() => void Share.share({ message: transport.log.map((p) => `${new Date(p.at).toLocaleTimeString()}  ${p.text}`).join('\n') || 'Log is empty.' })}
            style={{ flex: 1 }}
            a11y="Share the activity log"
          />
        </View>
        {showLog ? (
          <View style={[T.card, { padding: S.md, gap: S.xs }]}>
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

const LINK: Record<LinkState, { text: string; color: string }> = {
  connected: { text: 'Connected', color: C.ok },
  connecting: { text: 'Connecting…', color: C.warn },
  disconnected: { text: 'Not connected', color: C.muted },
  error: { text: 'Retrying…', color: C.warn },
};

function LinkLine({ state }: { state: LinkState }) {
  const p = LINK[state];
  return (
    <View accessibilityLabel={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
      <Text style={[T.sub, { color: p.color }]}>{p.text}</Text>
    </View>
  );
}
