import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

const TABS = [
  { name: 'Home',     label: 'Home',     icon: 'home-outline',           iconActive: 'home'            },
  { name: 'Devices',  label: 'Devices',  icon: 'list-outline',           iconActive: 'list'            },
  { name: 'Alerts',   label: 'Alerts',   icon: 'notifications-outline',  iconActive: 'notifications'   },
  { name: 'Charts',   label: 'Charts',   icon: 'stats-chart-outline',    iconActive: 'stats-chart'     },
  { name: 'Settings', label: 'Settings', icon: 'settings-outline',       iconActive: 'settings'        },
];

export default function BottomNavBar({ active, navigation }) {
  return (
    <View style={s.bar}>
      {TABS.map(tab => {
        const isActive = tab.name === active;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.tab}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={22}
              color={isActive ? Colors.primary.default : Colors.text.caption}
            />
            <Text style={[s.label, isActive && s.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={s.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    backgroundColor: Colors.surface.overlay,
    borderTopWidth:  1,
    borderTopColor:  Colors.surface.elevated,
    height:          58,
    paddingBottom:   4,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  label: {
    fontSize: Typography.size.xs,
    color:    Colors.text.caption,
    marginTop: 1,
  },
  labelActive: {
    color: Colors.primary.default,
  },
  dot: {
    position:        'absolute',
    bottom:          0,
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.primary.default,
  },
});
