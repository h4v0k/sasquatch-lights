import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { rgbToHs, toHex, wheelColor, type Rgb } from '../model/colors';
import { isPoliceColor } from '../model/modes';
import { C, T } from './theme';

/** Screens provide this so dragging on the wheel doesn't scroll the page. */
export const ScrollLock = React.createContext<(locked: boolean) => void>(() => undefined);

const SIZE = 264;
const R = SIZE / 2;
const KNOB = 34;

/**
 * Drag anywhere on the wheel to pick any color: around = hue, out from the center = saturation.
 * Brightness stays on its own slider. On front zones (`blockPolice`) red and blue sectors are dimmed
 * and can't be picked; dragging into them holds the last allowed color.
 */
export function ColorWheel({ value, active, onPick, blockPolice }: {
  value: Rgb; active: boolean; onPick: (rgb: Rgb) => void; blockPolice?: boolean;
}) {
  const lock = useContext(ScrollLock);
  const box = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const last = useRef(0);
  const [knob, setKnob] = useState(() => place(value));
  const [current, setCurrent] = useState<Rgb>(value);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!active) return;
    setKnob(place(value));
    setCurrent(value);
  }, [active, value[0], value[1], value[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (e: GestureResponderEvent, final: boolean) => {
    const dx = e.nativeEvent.pageX - origin.current.x - R;
    const dy = e.nativeEvent.pageY - origin.current.y - R;
    const { rgb } = wheelColor(dx, dy, R);
    if (blockPolice && isPoliceColor(rgb)) { setBlocked(true); return; }
    setBlocked(false);
    const d = Math.min(1, Math.hypot(dx, dy) / R);
    const a = Math.atan2(dy, dx);
    setKnob({ x: R + Math.cos(a) * d * R, y: R + Math.sin(a) * d * R });
    setCurrent(rgb);
    const now = Date.now();
    if (final || now - last.current > 90) { last.current = now; onPick(rgb); }
  };

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        ref={box}
        style={{ width: SIZE, height: SIZE }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          lock(true);
          const { pageX, pageY } = e.nativeEvent;
          const lx = e.nativeEvent.locationX, ly = e.nativeEvent.locationY;
          origin.current = { x: pageX - lx, y: pageY - ly };
          handle(e, false);
        }}
        onResponderMove={(e) => handle(e, false)}
        onResponderRelease={(e) => { handle(e, true); setBlocked(false); lock(false); }}
        onResponderTerminate={() => { setBlocked(false); lock(false); }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Color wheel, current color ${toHex(current)}`}
      >
        <Image source={blockPolice ? require('../../assets/wheel-front.png') : require('../../assets/wheel.png')} style={{ width: SIZE, height: SIZE }} />
        {active ? (
          <View
            pointerEvents="none"
            style={[styles.knob, { left: knob.x - KNOB / 2, top: knob.y - KNOB / 2, backgroundColor: toHex(current), borderColor: blocked ? C.warn : '#FFFFFF' }]}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: toHex(current), borderWidth: 1, borderColor: C.line2 }} />
        <Text style={T.body}>{active ? toHex(current) : 'Drag on the wheel for any color'}</Text>
      </View>
      {blocked ? <Text style={[T.sub, { color: C.warn }]}>Red and blue are blocked on front lights.</Text> : null}
    </View>
  );
}

function place(rgb: Rgb) {
  const { h, s } = rgbToHs(rgb);
  const a = (h * Math.PI) / 180;
  return { x: R + Math.cos(a) * s * R, y: R + Math.sin(a) * s * R };
}

const styles = StyleSheet.create({
  knob: { position: 'absolute', width: KNOB, height: KNOB, borderRadius: KNOB / 2, borderWidth: 4 },
});
