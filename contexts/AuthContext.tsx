import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  displayName?: string;
  age?: number;
  gender?: 'male' | 'female';
  profileCompleted?: boolean;
  qrBankImage?: string;
}

interface UserProfile {
  displayName: string;
  age: number;
  gender: 'male' | 'female';
  avatar?: string;
  qrBankImage?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData && userData.trim()) {
        try {
          const parsed = JSON.parse(userData) as User;
          if (parsed && typeof parsed === 'object' && parsed.id) {
            setUser(parsed);
            if (!parsed.profileCompleted) {
              router.replace('/profile-setup');
            } else {
              router.replace('/(tabs)');
            }
          } else {
            console.warn('Invalid user data format, redirecting to login');
            router.replace('/(auth)/login');
          }
        } catch (parseError) {
          console.error('Error parsing user JSON:', parseError);
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const mockUser: User = {
        id: '1',
        name: 'Người dùng',
        email,
        profileCompleted: false,
      };
      const userJson = JSON.stringify(mockUser);
      await AsyncStorage.setItem('user', userJson);
      setUser(mockUser);
      if (!mockUser.profileCompleted) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const mockUser: User = {
        id: '1',
        name,
        email,
        profileCompleted: false,
      };
      const userJson = JSON.stringify(mockUser);
      await AsyncStorage.setItem('user', userJson);
      setUser(mockUser);
      router.replace('/profile-setup');
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error('Đăng ký thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUserProfile = async (profile: UserProfile) => {
    if (!user) return;
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedUser: User = {
        ...user,
        displayName: profile.displayName,
        age: profile.age,
        gender: profile.gender,
        avatar: profile.avatar,
        qrBankImage: profile.qrBankImage ?? user.qrBankImage,
        profileCompleted: true,
      };
      setUser(updatedUser);
      const userJson = JSON.stringify(updatedUser);
      await AsyncStorage.setItem('user', userJson);
      if (!user.profileCompleted) {
        router.replace('/(tabs)');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    login,
    signup,
    logout,
    updateUserProfile,
  };
});