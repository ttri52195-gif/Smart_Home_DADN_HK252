import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ChartScreen from './src/screens/ChartScreen';
import AlertScreen from './src/screens/AlertScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: '#222' },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#4444aa',
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen}
          options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({color}) => <Text style={{color, fontSize:18}}>🏠</Text> }} />
        <Tab.Screen name="Chart" component={ChartScreen}
          options={{ tabBarLabel: 'Biểu đồ', tabBarIcon: ({color}) => <Text style={{color, fontSize:18}}>📈</Text> }} />
        <Tab.Screen name="Alert" component={AlertScreen}
          options={{ tabBarLabel: 'Cảnh báo', tabBarIcon: ({color}) => <Text style={{color, fontSize:18}}>🔔</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}