import React, { useRef } from 'react';
import {
  PanResponder,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';

interface TabScreenWrapperProps {
  children: React.ReactNode;
}

const TAB_ROUTES = ['home', 'friends', 'profile'];

export default function TabScreenWrapper({ children }: TabScreenWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const getCurrentIndex = () => {
    const currentRoute = TAB_ROUTES.find(route => {
      if (!route || route.length === 0) return false;
      return pathname.includes(route);
    });
    return currentRoute ? TAB_ROUTES.indexOf(currentRoute) : 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentIndex = getCurrentIndex();
        const threshold = 50;
        const velocity = gestureState.vx;
        
        if (gestureState.dx < -threshold || velocity < -0.3) {
          // Swipe left - go to next tab
          const nextIndex = Math.min(currentIndex + 1, TAB_ROUTES.length - 1);
          if (nextIndex !== currentIndex) {
            animateTransition(() => {
              const route = TAB_ROUTES[nextIndex];
              if (route === 'home') {
                router.push('/(tabs)/home');
              } else if (route === 'friends') {
                router.push('/(tabs)/friends');
              } else if (route === 'profile') {
                router.push('/(tabs)/profile');
              }
            });
          }
        } else if (gestureState.dx > threshold || velocity > 0.3) {
          // Swipe right - go to previous tab
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (prevIndex !== currentIndex) {
            animateTransition(() => {
              const route = TAB_ROUTES[prevIndex];
              if (route === 'home') {
                router.push('/(tabs)/home');
              } else if (route === 'friends') {
                router.push('/(tabs)/friends');
              } else if (route === 'profile') {
                router.push('/(tabs)/profile');
              }
            });
          }
        }
      },
    })
  ).current;

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (callback) {
      setTimeout(callback, 100);
    }
  };

  return (
    <Animated.View 
      style={[styles.container, { opacity: fadeAnim }]} 
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});