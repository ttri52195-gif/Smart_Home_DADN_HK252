import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen   from './src/screens/LoginScreen';
import HomeScreen    from './src/screens/HomeScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ChartScreen   from './src/screens/ChartScreen';
import AlertScreen   from './src/screens/AlertScreen';
import { Colors, Typography } from './src/theme';

const Tab = createBottomTabNavigator();

// active icon (filled) / inactive icon (outline) pairs
const TAB_SCREENS = [
  { name: 'Home',    component: HomeScreen,    label: 'Home',    icon: 'home',          iconOutline: 'home-outline'          },
  { name: 'Devices', component: DevicesScreen, label: 'Devices', icon: 'flash',         iconOutline: 'flash-outline'         },
  { name: 'Charts',  component: ChartScreen,   label: 'Charts',  icon: 'bar-chart',     iconOutline: 'bar-chart-outline'     },
  { name: 'Alerts',  component: AlertScreen,   label: 'Alerts',  icon: 'notifications', iconOutline: 'notifications-outline' },
];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface.overlay,
          borderTopColor:  Colors.surface.elevated,
          borderTopWidth:  1,
          paddingBottom:   4,
          height:          58,
        },
        tabBarActiveTintColor:   Colors.primary.default,
        tabBarInactiveTintColor: Colors.text.caption,
        tabBarLabelStyle: { fontSize: Typography.size.xs, marginBottom: 4 },
      }}
    >
      {TAB_SCREENS.map(({ name, component, label, icon, iconOutline }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? icon : iconOutline} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { token } = useAuth();
  return token ? <MainTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
