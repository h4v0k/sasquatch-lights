import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { ScrollLock } from './ColorWheel';
import { C } from './theme';

/**
 * Plain-JS slider (no native module), replacing @react-native-community/slider: its v5 iOS code
 * only builds under the new architecture, which this app has off. Same props the screens used.
 * Whole 48pt-tall row is the touch target; drag or tap anywhere on it.
 */
export function Slider({
  value, minimumValue, maximumValue, step = 1, disabled, onSlidingComplete, onValueChange,
  minimumTrackTintColor = C.accent, maximumTrackTintColor = C.line2, thumbTintColor = C.text,
  style, accessibilityLabel,
}: {
  value: number; minimumValue: number; maximumValue: number; step?: number; disabled?: boolean;
  onSlidingComplete?: (v: number) => void; onValueChange?: (v: number) => void;
  minimumTrackTintColor?: string; maximumTrackTintColor?: string; thumbTintColor?: string;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const lock = useContext(ScrollLock);
  const width = useRef(0);
  const left = useRef(0);
  const dragging = useRef(false);
  const [v, setV] = useState(value);

  useEffect(() => { if (!dragging.current) setV(value); }, [value]);

  const span = Math.max(0, maximumValue - minimumValue);
  const snap = (x: number) => {
    if (span === 0) return minimumValue;
    const raw = minimumValue + Math.min(1, Math.max(0, x / Math.max(1, width.current))) * span;
    const stepped = minimumValue + Math.round((raw - minimumValue) / step) * step;
    return Math.min(maximumValue, Math.max(minimumValue, stepped));
  };
  const at = (e: GestureResponderEvent) => snap(e.nativeEvent.pageX - left.current - THUMB / 2);
  const move = (e: GestureResponderEvent) => {
    const n = at(e);
    setV((old) => { if (old !== n) onValueChange?.(n); return n; });
  };
  const finish = (n: number) => { dragging.current = false; lock(false); onSlidingComplete?.(n); };
  const nudge = (dir: 1 | -1) => {
    const n = Math.min(maximumValue, Math.max(minimumValue, v + dir * step));
    setV(n); onValueChange?.(n); onSlidingComplete?.(n);
  };

  const frac = span === 0 ? 0 : (Math.min(maximumValue, Math.max(minimumValue, v)) - minimumValue) / span;

  return (
    <View
      style={[{ height: 48, justifyContent: 'center', opacity: disabled ? 0.4 : 1 }, style]}
      onLayout={(e: LayoutChangeEvent) => { width.current = Math.max(1, e.nativeEvent.layout.width - THUMB); }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        dragging.current = true;
        lock(true);
        left.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        move(e);
      }}
      onResponderMove={move}
      onResponderRelease={(e) => { const n = at(e); setV(n); finish(n); }}
      onResponderTerminate={() => finish(v)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: v }}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => { if (!disabled) nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1); }}
    >
      <View pointerEvents="none" style={{ marginHorizontal: THUMB / 2, height: TRACK, borderRadius: TRACK / 2, backgroundColor: maximumTrackTintColor }}>
        <View style={{ width: `${frac * 100}%`, height: TRACK, borderRadius: TRACK / 2, backgroundColor: minimumTrackTintColor }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: `${frac * 100}%`, marginLeft: -frac * THUMB,
          width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: thumbTintColor,
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
        }}
      />
    </View>
  );
}

const THUMB = 30;
const TRACK = 6;
