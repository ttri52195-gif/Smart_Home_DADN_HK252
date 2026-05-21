/**
 * components/ManualMode.js
 *
 * Chế độ Manual: hiển thị danh sách thiết bị dạng tab pill,
 * slider điều chỉnh giá trị (0-100), nút Save gọi API setDeviceState.
 *
 * Khớp Figma: tabs icon + tên, fan image, slider dọc, nút Save vàng.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { setDeviceState } from '../../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../../theme';

// ── icon & image theo device type ────────────────────────────────
const DEVICE_META = {
  LIGHT: { icon: 'sunny-outline', image: null },
  DIMMER: { icon: 'sunny-outline', image: null },
  DOOR: { icon: 'key-outline', image: null },
  MOTION: { icon: 'eye-outline', image: null },
  RGB: { icon: 'color-palette-outline', image: null },
  GENERIC: { icon: 'flash-outline', image: null },
  // FAN giả lập qua type GENERIC với key chứa 'fan'
};

function parseBool(val) {
  const s = String(val ?? '').toUpperCase();
  return s === 'ON' || s === '1' || s === 'TRUE' || s === 'OPEN';
}

function parseLevel(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 50 : Math.max(0, Math.min(100, n));
}

function isSliderDevice(type) {
  return type === 'LIGHT' || type === 'RGB';
}

// ── Slider dọc (vertical) ─────────────────────────────────────────
const SLIDER_H = 180;
const THUMB_R = 22;

function VerticalSlider({ value, onChange }) {
  const trackH = SLIDER_H - THUMB_R * 2;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      const pct = 1 - Math.max(0, Math.min(1, gs.moveY / trackH));
      onChange(Math.round(pct * 100));
    },
    onPanResponderGrant: (e) => {
      const pct =
        1 - Math.max(0, Math.min(1, e.nativeEvent.locationY / trackH));
      onChange(Math.round(pct * 100));
    },
  });

  const thumbTop = THUMB_R + (1 - value / 100) * trackH - THUMB_R;

  return (
    <View style={sl.wrapper} {...panResponder.panHandlers}>
      {/* Track */}
      <View style={sl.track}>
        {/* Fill */}
        <View style={[sl.fill, { height: `${value}%` }]} />
      </View>
      {/* Thumb */}
      <View style={[sl.thumb, { top: thumbTop }]} />
    </View>
  );
}

const sl = StyleSheet.create({
  wrapper: {
    width: 60,
    height: SLIDER_H,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  track: {
    width: 28,
    height: '100%',
    borderRadius: 14,
    backgroundColor: Colors.surface.elevated,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    backgroundColor: Colors.primary.default,
    borderRadius: 14,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_R * 2,
    height: THUMB_R * 2,
    borderRadius: THUMB_R,
    backgroundColor: Colors.surface.elevated,
    borderWidth: 3,
    borderColor: Colors.primary.default,
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

// ── Vertical Toggle (for non-slider devices) ─────────────────────
const VT_W    = 56;
const VT_H    = 100;
const VT_KNOB = 46;
const VT_PAD  = 5;

function BigVerticalToggle({ value, onChange }) {
  const isOn = parseBool(value);
  const anim = useRef(new Animated.Value(isOn ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue:         parseBool(value) ? 1 : 0,
      useNativeDriver: false,
      tension:         120,
      friction:        7,
    }).start();
  }, [value]);

  // knob at top = ON, knob at bottom = OFF
  const knobTop = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [VT_H - VT_KNOB - VT_PAD, VT_PAD],
  });

  function handlePress() {
    const v = String(value ?? '').toUpperCase();
    if (v === 'OPEN')  { onChange('CLOSE'); return; }
    if (v === 'CLOSE') { onChange('OPEN');  return; }
    onChange(isOn ? 'OFF' : 'ON');
  }

  const displayVal = String(value ?? 'OFF').toUpperCase();

  return (
    <View style={bvt.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[bvt.track, { backgroundColor: isOn ? Colors.primary.default : Colors.surface.elevated }]}
      >
        <Animated.View style={[bvt.knob, { top: knobTop }]} />
      </TouchableOpacity>
      <Text style={[bvt.label, { color: isOn ? Colors.primary.default : Colors.text.caption }]}>
        {displayVal}
      </Text>
    </View>
  );
}

const bvt = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.md },
  track: {
    width:        VT_W,
    height:       VT_H,
    borderRadius: VT_W / 2,
    overflow:     'hidden',
  },
  knob: {
    position:        'absolute',
    left:            VT_PAD,
    width:           VT_KNOB,
    height:          VT_KNOB,
    borderRadius:    VT_KNOB / 2,
    backgroundColor: '#fff',
    shadowColor:     '#000',
    shadowOpacity:   0.25,
    shadowRadius:    4,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       4,
  },
  label: {
    fontSize:   Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
});

// ── ManualMode Component ──────────────────────────────────────────
export default function ManualMode({ devices = [] }) {
  const { token } = useAuth();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [deviceValues, setDeviceValues] = useState(() => {
    const init = {};
    devices.forEach((d) => {
      const k = d.feed_key ?? d.key;
      const raw = d.value ?? d.last_value;
      init[k] = isSliderDevice(d.type) ? parseLevel(raw) : String(raw ?? 'OFF');
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const device   = devices[selectedIdx];
  const deviceKey = device ? (device.feed_key ?? device.key) : null;
  const currVal  = device ? (deviceValues[deviceKey] ?? (isSliderDevice(device.type) ? 50 : 'OFF')) : 50;
  const meta     = device ? (DEVICE_META[device.type] ?? DEVICE_META.GENERIC) : DEVICE_META.GENERIC;

  const handleLevelChange = useCallback((val) => {
    if (!deviceKey) return;
    setDeviceValues((prev) => ({ ...prev, [deviceKey]: val }));
  }, [deviceKey]);

  const handleToggleValue = useCallback((next) => {
    if (!deviceKey) return;
    setDeviceValues((prev) => ({ ...prev, [deviceKey]: next }));
  }, [deviceKey]);

  async function handleSave() {
    if (!device) return;
    setSaving(true);
    const stateVal = String(currVal);
    try {
      await setDeviceState(deviceKey, stateVal, token);
      Alert.alert('Saved', `${device.name ?? deviceKey} → ${stateVal}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (devices.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons
          name="flash-off-outline"
          size={36}
          color={Colors.text.caption}
        />
        <Text style={s.emptyText}>No devices in this room</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── Device Tabs ──────────────────────────────── */}
      <View style={s.tabsRow}>
        {devices.map((d, idx) => {
          const m = DEVICE_META[d.type] ?? DEVICE_META.GENERIC;
          const active = idx === selectedIdx;
          const dk = d.feed_key ?? d.key;
          return (
            <TouchableOpacity
              key={dk}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setSelectedIdx(idx)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={m.icon}
                size={18}
                color={active ? Colors.text.onGold : Colors.text.subtitle}
              />
              {active && (
                <Text style={s.tabLabel} numberOfLines={1}>
                  {d.name ?? dk}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Device Image placeholder ─────────────────── */}
      <View style={s.imageArea}>
        <View style={s.imagePlaceholder}>
          <Ionicons name={meta.icon} size={72} color={Colors.primary.default} />
          <Text style={s.deviceName}>{device?.name ?? deviceKey}</Text>
        </View>
      </View>

      {/* ── Slider / Toggle ──────────────────────────── */}
      <View style={s.sliderArea}>
        {isSliderDevice(device?.type) ? (
          <>
            <Text style={s.sliderValue}>{Math.round(currVal)}</Text>
            <VerticalSlider value={currVal} onChange={handleLevelChange} />
          </>
        ) : (
          <BigVerticalToggle value={currVal} onChange={handleToggleValue} />
        )}
      </View>

      {/* ── Save Button ──────────────────────────────── */}
      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={Colors.text.onGold} />
        ) : (
          <Text style={s.saveBtnText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: Spacing.xl },

  // Device tabs
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.card,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.primary.default,
  },
  tabLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onGold,
    maxWidth: 80,
  },

  // Device image area
  imageArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  deviceName: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.subtitle,
  },

  // Slider
  sliderArea: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  sliderValue: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.title,
  },

  // Save button
  saveBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtnText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onGold,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.size.md,
    color: Colors.text.caption,
  },
});
