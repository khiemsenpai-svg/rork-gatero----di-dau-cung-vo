import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform, ScrollView } from 'react-native';
import { DirectionsResult, getGoongDirections } from '@/utils/goongMapUtils';
import { useUserLocation } from '@/hooks/useUserLocation';

interface GoongMapProps {
  destinationLat: number;
  destinationLng: number;
  destinationName: string;
}

export default function GoongMap({ destinationLat, destinationLng, destinationName }: GoongMapProps) {
  const { location: userLocation, isLoading: locationLoading, error: locationError } = useUserLocation();
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [isLoadingDirections, setIsLoadingDirections] = useState<boolean>(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  useEffect(() => {
    if (userLocation) {
      fetchDirections();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const fetchDirections = async () => {
    if (!userLocation) return;
    
    setIsLoadingDirections(true);
    setDirectionsError(null);
    
    try {
      const result = await getGoongDirections(
        userLocation.latitude,
        userLocation.longitude,
        destinationLat,
        destinationLng,
        'car'
      );
      
      if (result) {
        setDirections(result);
      } else {
        setDirectionsError('Không thể tìm thấy đường đi');
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      setDirectionsError('Lỗi khi tìm đường đi');
    } finally {
      setIsLoadingDirections(false);
    }
  };

  if (locationLoading || isLoadingDirections) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#378699" />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Đang lấy vị trí của bạn...' : 'Đang tìm đường...'}
        </Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{locationError.message}</Text>
      </View>
    );
  }

  if (directionsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{directionsError}</Text>
      </View>
    );
  }

  if (!userLocation || !directions) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không có dữ liệu đường đi</Text>
      </View>
    );
  }

  const mapTilesApiKey = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.destinationTitle}>📍 {destinationName}</Text>
        
        {Platform.OS !== 'web' && mapTilesApiKey ? (
          <View style={styles.mapPreviewContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapComingSoon}>🗺️ Bản đồ tương tác</Text>
              <Text style={styles.mapComingSoonSubtext}>Đang tải...</Text>
            </View>
          </View>
        ) : null}
        
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>⏱️ Thời gian:</Text>
            <Text style={styles.infoValue}>{directions.duration}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📏 Khoảng cách:</Text>
            <Text style={styles.infoValue}>{directions.distance}</Text>
          </View>
        </View>

        <View style={styles.routeSection}>
          <Text style={styles.routeTitle}>🚗 Hướng dẫn đường đi:</Text>
          {directions.steps.map((step, index) => (
            <View key={`step-${index}`} style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                <Text style={styles.stepDistance}>{step.distance} • {step.duration}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.coordsSection}>
          <Text style={styles.coordsTitle}>📍 Tọa độ:</Text>
          <Text style={styles.coordsText}>
            Bạn: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.coordsText}>
            Đích: {destinationLat.toFixed(6)}, {destinationLng.toFixed(6)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  destinationTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  mapPreviewContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden' as const,
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#e8f4f8',
  },
  mapComingSoon: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#378699',
    marginBottom: 8,
  },
  mapComingSoonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  infoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600' as const,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'bold' as const,
  },
  routeSection: {
    marginBottom: 20,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row' as const,
    marginBottom: 16,
    alignItems: 'flex-start' as const,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#378699',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold' as const,
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 13,
    color: '#888',
  },
  coordsSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#378699',
  },
  coordsTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#378699',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 13,
    color: '#555',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    textAlign: 'center' as const,
  },
});
