import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen  from './src/screens/HomeScreen';
import ChartScreen from './src/screens/ChartScreen';
import AlertScreen from './src/screens/AlertScreen';

const Tab = createBottomTabNavigator();

function SettingsScreen() {
  return (
    <View style={s.center}>
      <Text style={s.placeholder}>⚙️  Cài đặt</Text>
      <Text style={[s.placeholder, { fontSize: 12, marginTop: 8 }]}>Sắp ra mắt</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#1a1a3e', borderTopWidth: 1 },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#333366',
          tabBarLabelStyle: { fontSize: 10 },
        }}
      >
        <Tab.Screen name="Tổng quan" component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text> }} />
        <Tab.Screen name="Biểu đồ" component={ChartScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📊</Text> }} />
        <Tab.Screen name="Cảnh báo" component={AlertScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔔</Text> }} />
        <Tab.Screen name="Cài đặt" component={SettingsScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
  placeholder: { color: '#4444aa', fontSize: 16 },
});
