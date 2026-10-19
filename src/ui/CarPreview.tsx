import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { screenHex } from '../model/colors';
import type { Mode } from '../model/modes';
import type { ZoneId } from '../rules';

// Photo cutouts of havok's car plus a white glow layer per zone, tinted at runtime.
// Generated from assets/car (see assets/car/README.md). Sizes match assets/car/layers/layers.json.
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
  },
  rear: {
    w: 660, h: 690,
    car: require('../../assets/car/layers/rear-car.webp'),
    zones: {
      under: require('../../assets/car/layers/rear-under.png'),
      tail: require('../../assets/car/layers/rear-tail.png'),
    },
  },
} as const satisfies Record<View3, { w: number; h: number; car: ImageSourcePropType; zones: Partial<Record<ZoneId, ImageSourcePropType>> }>;

const ORDER_OVER: ZoneId[] = ['engine', 'grille', 'head', 'tail'];

export function CarPreview({ mode, view, label }: { mode: Mode; view: View3; label?: string }) {
  const v = L[view];
  const zones = v.zones as Partial<Record<ZoneId, ImageSourcePropType>>;
  const layer = (k: ZoneId) => {
    const src = zones[k];
    const z = mode.zones[k];
    if (!src || !z.on) return null;
    return (
      <Image
        key={k}
        source={src}
        style={[StyleSheet.absoluteFill, { tintColor: screenHex(z.color, z.custom), opacity: 0.3 + 0.7 * (z.brightness / 100) }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    );
  };
  return (
    <View
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? `${view} view of the car with the current lights`}
    >
      <View style={{ width: '100%', aspectRatio: v.w / v.h }}>
        {layer('under')}
        <Image source={v.car} style={StyleSheet.absoluteFill} resizeMode="stretch" />
        {ORDER_OVER.map(layer)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0B0C0D', paddingHorizontal: 6, paddingTop: 8 },
});
