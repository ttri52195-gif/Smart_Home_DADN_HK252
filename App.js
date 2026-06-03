import 'react-native-gesture-handler';
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen           from './src/screens/LoginScreen';
import ForgotPasswordScreen  from './src/screens/ForgotPasswordScreen';
import HomeScreen            from './src/screens/HomeScreen';
import DevicesScreen         from './src/screens/DevicesScreen';
import AlertScreen           from './src/screens/AlertScreen';
import ChartScreen           from './src/screens/ChartScreen';
import SettingsScreen        from './src/screens/SettingsScreen';
import AccountSettingsScreen  from './src/screens/AccountSettingsScreen';
import ChangePasswordScreen  from './src/screens/ChangePasswordScreen';
import FamilyMemberScreen    from './src/screens/FamilyMemberScreen';
import RoomDeviceScreen           from './src/screens/RoomDeviceScreen';
import RoomSettingScreen          from './src/screens/RoomSetting/RoomSettingScreen';
import ThresholdSettingsScreen    from './src/screens/ThresholdSettingsScreen';
import { Colors, Typography } from './src/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_SCREENS = [
  {
    name: 'Home',     component: HomeScreen,     label: 'Home',
    icon: Platform.OS === 'ios' ? 'house'            : 'home',
  },
  {
    name: 'Devices',  component: DevicesScreen,  label: 'Devices',
    icon: Platform.OS === 'ios' ? 'list.bullet'      : 'bolt',
  },
  {
    name: 'Alerts',   component: AlertScreen,    label: 'Alerts',
    icon: Platform.OS === 'ios' ? 'bell'             : 'notifications',
  },
  {
    name: 'Charts',   component: ChartScreen,    label: 'Charts',
    icon: Platform.OS === 'ios' ? 'chart.xyaxis.line' : 'bar_chart',
  },
  {
    name: 'Settings', component: SettingsScreen, label: 'Settings',
    icon: Platform.OS === 'ios' ? 'gearshape'        : 'settings',
  },
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
          paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
          paddingTop:      8,
          height:          Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarActiveTintColor:   Colors.primary.default,
        tabBarInactiveTintColor: Colors.text.caption,
        tabBarLabelStyle: { fontSize: Typography.size.xs },
      }}
    >
      {TAB_SCREENS.map(({ name, component, label, icon }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={icon}
                size={22}
                tintColor={color}
                type="monochrome"
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function GuestNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { token } = useAuth();
  if (!token) return <GuestNavigator />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"            component={MainTabs} />
      <Stack.Screen
        name="RoomSetting"
        component={RoomSettingScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="FamilyMember"
        component={FamilyMemberScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="RoomDevice"
        component={RoomDeviceScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="ThresholdSettings"
        component={ThresholdSettingsScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
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
