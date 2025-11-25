import { Tabs } from 'expo-router';
import { Home, Users, User } from 'lucide-react-native';
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Animated } from 'react-native';

function TabBarIcon({ 
  focused, 
  color, 
  size, 
  IconComponent 
}: { 
  focused: boolean; 
  color: string; 
  size: number; 
  IconComponent: React.ComponentType<{ color: string; size: number }>; 
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scaleAnim, opacityAnim]);

  return (
    <Animated.View 
      style={[
        styles.tabIconContainer, 
        focused && styles.tabIconFocused,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <IconComponent color={color} size={size} />
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#378699',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerStyle: {
          backgroundColor: 'white',
        },
        headerTintColor: '#378699',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          borderColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 0,
        },
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          headerTitle: () => (
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/zcy309uwwoovwycov4ds9' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon 
              focused={focused} 
              color={color} 
              size={size} 
              IconComponent={Home} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Nhóm bạn',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon 
              focused={focused} 
              color={color} 
              size={size} 
              IconComponent={Users} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon 
              focused={focused} 
              color={color} 
              size={size} 
              IconComponent={User} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    padding: 2,
    borderRadius: 8,
  },
  tabIconFocused: {
    backgroundColor: '#e8f4f8',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 32,
  },
});