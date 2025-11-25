import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface LocationError {
  message: string;
  code?: string;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError({ message: 'Geolocation không được hỗ trợ trên trình duyệt này' });
          setPermissionStatus('denied');
          setIsLoading(false);
          return false;
        }
        setPermissionStatus('granted');
        return true;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setHasPermission(granted);
        
        if (status === 'denied') {
          setPermissionStatus('denied');
          setError({ message: 'Vui lòng cấp quyền truy cập vị trí trong cài đặt thiết bị' });
          setIsLoading(false);
          return false;
        } else if (granted) {
          setPermissionStatus('granted');
          return true;
        } else {
          setPermissionStatus('undetermined');
          setError({ message: 'Vui lòng cấp quyền truy cập vị trí để sử dụng tính năng này' });
          setIsLoading(false);
          return false;
        }
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError({ message: 'Không thể yêu cầu quyền truy cập vị trí' });
      setPermissionStatus('denied');
      setIsLoading(false);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    const hasAccess = await requestLocationPermission();
    if (!hasAccess) return;

    try {
      if (Platform.OS === 'web') {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            setIsLoading(false);
          },
          (err) => {
            console.error('Web geolocation error:', err);
            setError({ 
              message: 'Không thể lấy vị trí. Vui lòng kiểm tra cài đặt trình duyệt.',
              code: err.code.toString()
            });
            setIsLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        );
      } else {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
        });
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setError({ 
        message: 'Không thể lấy vị trí hiện tại. Vui lòng kiểm tra GPS và thử lại.' 
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLocation = () => {
    getCurrentLocation();
  };

  return {
    location,
    error,
    isLoading,
    hasPermission,
    permissionStatus,
    refreshLocation,
    requestPermission: requestLocationPermission,
  };
}
