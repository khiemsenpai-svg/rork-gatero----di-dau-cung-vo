import React, { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      console.log('[Login] Google login pressed');
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await login('google@example.com', 'password');
    } catch (error) {
      console.error('[Login] Google login error', error);
      Alert.alert('Lỗi', 'Không thể đăng nhập bằng Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      console.log('[Login] Facebook login pressed');
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await login('facebook@example.com', 'password');
    } catch (error) {
      console.error('[Login] Facebook login error', error);
      Alert.alert('Lỗi', 'Không thể đăng nhập bằng Facebook');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/trz8li3dezqmfgx1ehh5c' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header} testID="login-header">
              <Text style={styles.welcomeText}>Chào mừng đến với</Text>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qdje2dz4ifsxgkjpngauk' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.footer} testID="login-footer">
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, isLoading && styles.disabledButton]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                testID="login-google-button"
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/suuzuii25pk19woq0hbws' }}
                  style={styles.socialIcon}
                />
                <Text style={styles.googleButtonText}>
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton, isLoading && styles.disabledButton]}
                onPress={handleFacebookLogin}
                disabled={isLoading}
                testID="login-facebook-button"
              >
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/dx6swwem042o8bzceqszf' }}
                  style={styles.socialIcon}
                />
                <Text style={styles.facebookButtonText}>
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Facebook'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#388699',
    marginBottom: 16,
  },
  logo: {
    width: 280,
    height: 100,
  },
  footer: {
    paddingBottom: 24,
  },
  socialButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: 'white',
    borderColor: '#ddd',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  facebookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
});