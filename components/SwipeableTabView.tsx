import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';

interface SwipeableTabViewProps {
  children: React.ReactNode;
  routes: string[];
  currentRoute: string;
}

export default function SwipeableTabView({ 
  children, 
  routes,
  currentRoute 
}: SwipeableTabViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const animateToIndex = useCallback((index: number) => {
    Animated.spring(translateX, {
      toValue: -index * screenWidth,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [screenWidth, translateX]);

  useEffect(() => {
    const index = routes.findIndex(route => {
      if (!route || route.length === 0) return false;
      return pathname.includes(route);
    });
    if (index !== -1 && index !== currentIndex) {
      animateToIndex(index);
      setCurrentIndex(index);
    }
  }, [pathname, routes, currentIndex, animateToIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = -currentIndex * screenWidth + gestureState.dx;
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = screenWidth / 3;
        const velocity = gestureState.vx;
        
        let newIndex = currentIndex;
        
        if (gestureState.dx < -threshold || velocity < -0.5) {
          // Swipe left
          newIndex = Math.min(currentIndex + 1, routes.length - 1);
        } else if (gestureState.dx > threshold || velocity > 0.5) {
          // Swipe right
          newIndex = Math.max(currentIndex - 1, 0);
        }
        
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
          const route = routes[newIndex];
          if (route === 'home') {
            router.push('/(tabs)/home');
          } else if (route === 'friends') {
            router.push('/(tabs)/friends');
          } else if (route === 'profile') {
            router.push('/(tabs)/profile');
          }
        }
        
        animateToIndex(newIndex);
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            transform: [{ translateX }],
            width: screenWidth * routes.length,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
});