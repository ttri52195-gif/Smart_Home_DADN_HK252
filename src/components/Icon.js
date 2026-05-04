// Thin wrapper around Ionicons.
// Use this everywhere instead of emoji so icons are consistent and scalable.
//
// Icon names: https://ionic.io/ionicons
// Each icon has a solid and outline variant, e.g. "home" / "home-outline".

import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function Icon({ name, size = 22, color, style }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
