// Design tokens extracted from ux-ui/ design system

export const Colors = {
  // ── Surfaces ──────────────────────────────────────────
  surface: {
    overlay:  '#1A1D20', // nav bars, modals, status bar
    base:     '#292D31', // main screen background
    card:     '#2F3439', // card / list row background
    elevated: '#4A535E', // hover state, inactive toggles
  },

  // ── Text ──────────────────────────────────────────────
  text: {
    title:    '#FFFFFF',
    subtitle: '#D5D9E0',
    body:     '#B8BCC2',
    caption:  '#6B7280',
    disabled: '#4A535E',
    onGold:   '#1A1D20', // text that sits on top of gold fills
  },

  // ── Primary gold ramp ─────────────────────────────────
  primary: {
    subtle:  '#FCE597', // Yellow/100  – tint, label on dark fill
    lighter: '#C6AD40', // Yellow/200ish – mid accent
    default: '#E4B518', // Yellow/300  – main CTA, active state
    darker:  '#524416', // Brown/800   – pressed state
    brand:   '#7E640D', // Brown/600   – logo, headers
  },

  // ── Semantic single-value tokens ─────────────────────
  success: '#27AE60',
  warning: '#F59E0B',
  error:   '#EB5757',
  info:    '#2F80ED',

  // ── Device state colours ──────────────────────────────
  state: {
    on:     '#E4B518', // active / on
    off:    '#6B7280', // inactive / off
    auto:   '#8B5CF6', // sensor-managed / automation
    secure: '#27AE60', // locked / secured
  },

  // ── Data visualisation ────────────────────────────────
  data: {
    temperature: '#EF4444',
    humidity:    '#3B82F6',
    light:       '#E4B518',
    motion:      '#10B981',
    gas:         '#F59E0B',
    rain:        '#60A5FA',
  },
};

export const Typography = {
  size: {
    xs:  10,
    sm:  12,
    md:  14,
    lg:  16,
    xl:  18,
    xxl: 22,
  },
  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
};

export const Spacing = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  xxxl: 32,
};

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999,
};
