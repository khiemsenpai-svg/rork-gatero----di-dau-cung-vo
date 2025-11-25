import React, { useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        router.replace('/(auth)/login');
      } catch (e) {
        console.log('Navigation error to login', e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container} testID="welcome-screen">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/zcy309uwwoovwycov4ds9' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.slogan} numberOfLines={2} adjustsFontSizeToFit testID="welcome-slogan">
              Đi đâu cũng vô
            </Text>
          </View>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#378699" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center' as const,
    marginTop: height * 0.15,
  },
  logo: {
    width: 320,
    height: 120,
    marginBottom: 20,
  },
  slogan: {
    fontSize: 28,
    color: '#111111',
    fontWeight: '800' as const,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },
  loaderContainer: {
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    color: '#378699',
    fontSize: 14,
  },
});