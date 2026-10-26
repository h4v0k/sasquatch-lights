import React, { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { screenHex } from '../model/colors';
import type { Mode } from '../model/modes';
import type { ZoneId } from '../rules';

// Photo cutouts of havok's car, graded to night, plus a white glow layer per zone (sharp lamp + soft halo),
// tinted at runtime. Built by tools/night_preview.py from assets/car/layers-src. Sizes match assets/car/layers/layers.json.
type View3 = 'side' | 'front' | 'rear';

const L = {
  side: {
    w: 864, h: 300,
    car: require('../../assets/car/layers/side-car.webp'),
    zones: {
      under: require('../../assets/car/layers/side-under.png'),
      head: require('../../assets/car/layers/side-head.png'),
      tail: require('../../assets/car/layers/side-tail.png'),
      grille: require('../../assets/car/layers/side-grille.png'),
    },
    spill: require('../../assets/car/layers/side-underspill.png'),
    hot: { head: require('../../assets/car/layers/side-head-hot.png'), tail: require('../../assets/car/layers/side-tail-hot.png') },
  },
  front: {
    w: 628, h: 576,
    car: require('../../assets/car/layers/front-car.webp'),
    zones: {
      under: require('../../assets/car/layers/front-under.png'),
      head: require('../../assets/car/layers/front-head.png'),
      grille: require('../../assets/car/layers/front-grille.png'),
      engine: require('../../assets/car/layers/front-engine.png'),
    },
    spill: require('../../assets/car/layers/front-underspill.png'),
    hot: { head: require('../../assets/car/layers/front-head-hot.png') },
  },
  rear: {
    w: 660, h: 690,
    car: require('../../assets/car/layers/rear-car.webp'),
    zones: {
      under: require('../../assets/car/layers/rear-under.png'),
      tail: require('../../assets/car/layers/rear-tail.png'),
    },
    spill: require('../../assets/car/layers/rear-underspill.png'),
    hot: { tail: require('../../assets/car/layers/rear-tail-hot.png') },
  },
} as const satisfies Record<View3, {
  w: number; h: number; car: ImageSourcePropType;
  zones: Partial<Record<ZoneId, ImageSourcePropType>>;
  /** Underglow light catching the lower body, drawn over the car. */
  spill: ImageSourcePropType;
  /** White-hot LED centers, drawn untinted over the colored lamp. */
  hot: Partial<Record<ZoneId, ImageSourcePropType>>;
}>;

const ORDER_OVER: ZoneId[] = ['engine', 'grille', 'head', 'tail'];

/** The black stage is the same shape for every view, so switching views doesn't jump the page. */
const STAGE_ASPECT = 1.5;
/** Share of the stage the car may fill, leaving black around it. */
const FIT_W = 0.94;
const FIT_H = 0.9;

export function CarPreview({ mode, view, label }: { mode: Mode; view: View3; label?: string }) {
  const v = L[view];
  const [stageW, setStageW] = useState(0);
  const stageH = stageW / STAGE_ASPECT;
  const k = Math.min((stageW * FIT_W) / v.w, (stageH * FIT_H) / v.h);
  const carW = v.w * k, carH = v.h * k;
  const zones = v.zones as Partial<Record<ZoneId, ImageSourcePropType>>;
  const hots = v.hot as Partial<Record<ZoneId, ImageSourcePropType>>;
  const img = (key: string, src: ImageSourcePropType, tint: string | undefined, opacity: number) => (
    <Image
      key={key}
      source={src}
      style={[StyleSheet.absoluteFill, { tintColor: tint, opacity }]}
      resizeMode="stretch"
      accessibilityIgnoresInvertColors
    />
  );
  const level = (k: ZoneId) => 0.35 + 0.65 * (mode.zones[k].brightness / 100);
  const layer = (k: ZoneId) => {
    const src = zones[k];
    const z = mode.zones[k];
    if (!src || !z.on) return null;
    const tint = screenHex(z.color, z.custom);
    return (
      <React.Fragment key={k}>
        {img(k, src, tint, level(k))}
        {hots[k] ? img(k + '-hot', hots[k]!, '#FFFFFF', 0.55 * level(k)) : null}
      </React.Fragment>
    );
  };
  const under = mode.zones.under;
  return (
    <View
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? `${view} view of the car with the current lights`}
    >
      <View
        style={{ width: '100%', aspectRatio: STAGE_ASPECT, alignItems: 'center', justifyContent: 'center' }}
        onLayout={(e) => setStageW(e.nativeEvent.layout.width)}
      >
        {stageW > 0 ? (
          <View style={{ width: carW, height: carH }}>
            {layer('under')}
            <Image source={v.car} style={StyleSheet.absoluteFill} resizeMode="stretch" />
            {under.on ? img('spill', v.spill, screenHex(under.color, under.custom), level('under')) : null}
            {ORDER_OVER.map(layer)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000' },
});
