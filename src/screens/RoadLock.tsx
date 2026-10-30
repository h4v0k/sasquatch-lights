import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { shownZones } from '../model/known';
import { ZONE_LABEL } from '../model/modes';
import { hasRuleSet, rulesFor } from '../rules';
import { useStore } from '../store';
import { LockOptions, lockSummary } from '../ui/LockControl';
import { KV, Notice, Section } from '../ui/parts';
import { S, T } from '../ui/theme';

export function RoadLock() {
  const s = useStore();
  const sum = lockSummary(s);
  const rules = rulesFor(s.regionCode);
  const zones = shownZones(s.devices);
  const locText = { starting: 'Finding your state', ok: 'On', denied: 'Off for this app', unavailable: 'No signal' }[s.location];
  const where = hasRuleSet(s.regionCode) ? rules.region : s.regionCode ? `${s.regionCode} (default rules)` : 'Unknown (default rules)';

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.xl, paddingBottom: S.xxl }}>
      <Notice kind={sum.on ? 'ok' : 'info'} text={sum.on ? 'Locked now. Your lights are held to road-legal colors.' : 'Unlocked now. Your lights show the colors you picked.'} />

      <Section title="When to lock" hint="The lock keeps you legal on the road. It never changes your saved modes; it just holds the lights to legal colors until you park.">
        <LockOptions />
      </Section>

      <Section title="While locked">
        <View style={T.card}>
          {zones.map((z, i) => <KV key={z} k={ZONE_LABEL[z]} v={rules.zones[z].note} last={i === zones.length - 1} />)}
        </View>
        <Text style={T.sub}>Red and blue are never used on the grille or underglow, locked or not.</Text>
      </Section>

      <Section title="Right now">
        <View style={T.card}>
          <KV k="State" v={where} />
          <KV k="Location" v={locText} />
          <KV k="Speed" v={s.motion.mph !== null ? `${s.motion.mph} mph` : 'No GPS speed yet'} last />
        </View>
      </Section>

      <Text style={T.small}>
        Based on our reading of {rules.cite}. Not legal advice. No Florida statute covers underglow, grille or engine-bay lighting, so those follow the red/blue and no-flashing limits by analogy. Works only while the app is open on screen. Location is used for speed and to look up your state: coordinates go to the phone's geocoder (Google on Android, Apple on iPhone) every 10 minutes while the app is open, and only the state is kept.
      </Text>
    </ScrollView>
  );
}
