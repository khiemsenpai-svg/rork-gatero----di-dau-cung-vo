import { router } from 'expo-router';
import { MapPin, Users, Clock, ExternalLink, Loader2 } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroups, type Member } from '@/contexts/GroupContext';
import { trpc } from '@/lib/trpc';
import { trpcClient } from '@/lib/trpc';
import { useUserLocation } from '@/hooks/useUserLocation';

interface LocationSuggestion {
  placeId: string;
  name: string;
  address: string;
  type: string;
  description: string;
  estimatedTime?: string;
  googleMapsUrl: string;
  lat?: number;
  lng?: number;
  distance?: number;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  photoUrl?: string;
}

export default function FindLocationScreen() {
  const { currentGroup } = useGroups();
  const { location: userLocation, refreshLocation, requestPermission } = useUserLocation();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!currentGroup) {
      router.back();
    }
  }, [currentGroup]);

  if (!currentGroup) {
    return null;
  }

  const getCenterPoint = async (members: Member[]) => {
    // If user has GPS location, use it
    if (userLocation) {
      return {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        address: 'Vị trí hiện tại của bạn'
      };
    }
    
    // Try to geocode the first member's address using backend API
    if (members.length > 0) {
      const firstMemberAddress = members[0].location;
      try {
        const geocodeResult = await trpcClient.places.geocode.query({ 
          address: firstMemberAddress + ', Việt Nam' 
        });
        
        if (geocodeResult) {
          return {
            lat: geocodeResult.location.lat,
            lng: geocodeResult.location.lng,
            address: firstMemberAddress
          };
        }
      } catch (error) {
        console.log('Geocoding error, using default location');
      }
    }
    
    // Default to Ho Chi Minh City center
    return {
      lat: 10.7769,
      lng: 106.7009,
      address: 'Hồ Chí Minh'
    };
  };





  const findSuitableLocations = async () => {
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // Request location permission if not already granted
      if (!userLocation) {
        await requestPermission();
      }
      
      const memberLocations = currentGroup.members.map(m => m.location).join(', ');
      const groupSize = currentGroup.members.length;
      
      // Get center point for search
      const centerPoint = await getCenterPoint(currentGroup.members);
      setSearchLocation({ lat: centerPoint.lat, lng: centerPoint.lng });
      
      console.log('🔍 Searching from location:', centerPoint);
      
      // Parse desired location from group settings
      const desiredTypes = currentGroup.desiredLocation || currentGroup.hostPreferredLocation || 'cafe';
      
      // Search for places using backend Google Places API
      const searchCategories = [
        desiredTypes,
        'cafe',
        'restaurant',
        'quán ăn',
        'nhà hàng'
      ];
      
      interface PlaceSearchResult {
        placeId: string;
        name: string;
        address: string;
        lat: number;
        lng: number;
        rating?: number;
        isOpen?: boolean;
        priceLevel?: number;
        types?: string[];
        photoUrl?: string;
        distance?: number;
      }
      
      const allPlaces: PlaceSearchResult[] = [];
      
      for (const category of searchCategories) {
        console.log(`Searching for: ${category}`);
        try {
          const searchResult = await trpcClient.places.searchByCategory.query({
            category: category,
            lat: centerPoint.lat,
            lng: centerPoint.lng,
            radius: 5000 // 5km radius
          });
          
          if (searchResult && searchResult.places) {
            allPlaces.push(...searchResult.places);
          }
        } catch (error) {
          console.error(`Error searching for ${category}:`, error);
        }
      }
      
      // Remove duplicates based on placeId
      const uniquePlaces = Array.from(
        new Map(allPlaces.map(p => [p.placeId, p])).values()
      );
      
      console.log(`✅ Found ${uniquePlaces.length} unique places from Google Places`);
      
      if (uniquePlaces.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy địa điểm phù hợp. Vui lòng kiểm tra vị trí hoặc thử lại.');
        setIsLoading(false);
        return;
      }
      
      // Prepare places for AI analysis
      const placesInfo = uniquePlaces.slice(0, 20).map(p => ({
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        rating: p.rating,
        priceLevel: p.priceLevel,
        isOpen: p.isOpen,
        photoUrl: p.photoUrl,
        distance: p.distance,
        types: p.types?.join(', ') || 'Địa điểm'
      }));
      
      const prompt = `Tôi có một nhóm ${groupSize} người với các địa chỉ sau: ${memberLocations}.
Nhóm muốn tìm: ${desiredTypes}
${userLocation ? `Vị trí GPS hiện tại: ${userLocation.latitude}, ${userLocation.longitude}` : ''}

Danh sách địa điểm THỰC TẾ từ Google Places API:
${JSON.stringify(placesInfo, null, 2)}

Yêu cầu:
1. Chọn 5 địa điểm PHÙ HỢP NHẤT từ danh sách trên
2. Ưu tiên:
   - Địa điểm gần nhất (dựa vào distance)
   - Rating cao (nếu có)
   - Đang mở cửa (isOpen = true)
   - Giá cả phù hợp (priceLevel thấp hoặc trung bình)
3. Phù hợp với mục đích gặp mặt của nhóm
4. Đánh giá độ tiện lợi, không gian, phù hợp cho ${groupSize} người

Trả về dưới dạng JSON array với format:
[{
  "placeId": "Place ID từ danh sách",
  "name": "Tên từ danh sách",
  "address": "Địa chỉ từ danh sách",
  "type": "Loại địa điểm",
  "description": "Mô tả ngắn tại sao phù hợp (1-2 câu)",
  "estimatedTime": "Khoảng cách từ vị trí tìm kiếm",
  "rating": "Điểm đánh giá nếu có",
  "priceLevel": "Mức giá nếu có",
  "isOpen": "Trạng thái mở cửa nếu có"
}]

CHỈ chọn từ danh sách trên, KHÔNG tạo địa điểm mới.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const data = await response.json();
      
      try {
        let jsonText = data.completion;
        
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }
        
        jsonText = jsonText.replace(/^[^\[{]*/, '').replace(/[^\]}]*$/, '');
        
        const parsedSuggestions = JSON.parse(jsonText);
        
        const suggestionsWithDetails = parsedSuggestions.map((suggestion: any) => {
          const matchedPlace = placesInfo.find(p => p.placeId === suggestion.placeId);
          
          if (!matchedPlace) {
            console.warn('Place not found in original list:', suggestion.placeId);
          }
          
          return {
            ...suggestion,
            lat: matchedPlace?.lat || suggestion.lat,
            lng: matchedPlace?.lng || suggestion.lng,
            photoUrl: matchedPlace?.photoUrl,
            distance: matchedPlace?.distance,
            googleMapsUrl: matchedPlace 
              ? `https://www.google.com/maps/search/?api=1&query=${matchedPlace.lat},${matchedPlace.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suggestion.address)}`
          };
        });
        
        setSuggestions(suggestionsWithDetails);
        console.log('Final suggestions:', suggestionsWithDetails);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', data.completion);
        Alert.alert('Lỗi', 'Không thể xử lý kết quả từ AI. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error finding locations:', error);
      Alert.alert('Lỗi', 'Không thể tìm địa điểm. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = async (suggestion: LocationSuggestion) => {
    try {
      const supported = await Linking.canOpenURL(suggestion.googleMapsUrl);
      if (supported) {
        await Linking.openURL(suggestion.googleMapsUrl);
      } else {
        Alert.alert('Lỗi', 'Không thể mở Google Maps');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Lỗi', 'Không thể mở Google Maps');
    }
  };

  const getCommonAvailableTime = () => {
    if (!currentGroup.timeRange) return null;
    
    const membersWithSchedule = currentGroup.members.filter(m => m.availableSlots && m.availableSlots.length > 0);
    if (membersWithSchedule.length === 0) return null;

    // Find common time slots
    const commonSlots: string[] = [];
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    
    days.forEach(day => {
      for (let hour = 9; hour <= 21; hour++) {
        const availableCount = membersWithSchedule.filter(member => 
          member.availableSlots?.some(slot => 
            slot.day === day && 
            parseInt(slot.startTime) <= hour && 
            parseInt(slot.endTime) > hour
          )
        ).length;
        
        if (availableCount === currentGroup.members.length) {
          commonSlots.push(`${day} ${hour}:00`);
        }
      }
    });

    return commonSlots.length > 0 ? commonSlots.slice(0, 3).join(', ') : null;
  };

  const commonTime = getCommonAvailableTime();

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.content}>
        <View style={styles.groupInfo}>
          <View style={styles.groupInfoCard}>
            <Users size={24} color="#378699" />
            <Text style={styles.groupName}>{currentGroup.name}</Text>
            <Text style={styles.groupDetails}>
              {currentGroup.members.length} thành viên
            </Text>
            {commonTime && (
              <View style={styles.timeInfo}>
                <Clock size={16} color="#4CAF50" />
                <Text style={styles.timeText}>Thời gian rảnh chung: {commonTime}</Text>
              </View>
            )}
            {userLocation && (
              <View style={styles.locationInfo}>
                <MapPin size={16} color="#2196F3" />
                <Text style={styles.locationText}>Đang sử dụng vị trí GPS của bạn</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.membersPreview}>
          <Text style={styles.sectionTitle}>Địa chỉ thành viên</Text>
          {currentGroup.members.map((member) => (
            <View key={member.id} style={styles.memberLocationCard}>
              <MapPin size={16} color="#666" />
              <View style={styles.memberLocationInfo}>
                <Text style={styles.memberLocationName}>{member.name}</Text>
                <Text style={styles.memberLocationAddress}>{member.location}</Text>
              </View>
            </View>
          ))}
        </View>

        {!hasSearched ? (
          <View style={styles.searchSection}>
            <Text style={styles.searchTitle}>Tìm địa điểm gặp mặt</Text>
            <Text style={styles.searchDescription}>
              Garott sẽ phân tích vị trí của các thành viên và gợi ý những địa điểm phù hợp nhất cho cuộc gặp mặt của nhóm bạn.
            </Text>
            <TouchableOpacity
              style={[styles.searchButton, isLoading && styles.searchButtonDisabled]}
              onPress={findSuitableLocations}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={20} color="white" />
              ) : (
                <MapPin size={20} color="white" />
              )}
              <Text style={styles.searchButtonText}>
                {isLoading ? 'Đang tìm kiếm...' : 'Tìm địa điểm phù hợp'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Gợi ý địa điểm</Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Loader2 size={32} color="#378699" />
                <Text style={styles.loadingText}>Garott đang phân tích và tìm địa điểm phù hợp...</Text>
              </View>
            ) : suggestions.length > 0 ? (
              <View style={styles.suggestionsList}>
                {suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName}>{suggestion.name}</Text>
                        <Text style={styles.suggestionType}>{suggestion.type}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.mapsButton}
                        onPress={() => openInMaps(suggestion)}
                      >
                        <ExternalLink size={18} color="#378699" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.suggestionDetails}>
                      <View style={styles.addressRow}>
                        <MapPin size={14} color="#666" />
                        <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
                      </View>
                      
                      {suggestion.estimatedTime && (
                        <View style={styles.timeRow}>
                          <Clock size={14} color="#666" />
                          <Text style={styles.suggestionTime}>{suggestion.estimatedTime}</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                    
                    {suggestion.rating && (
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>⭐ {suggestion.rating.toFixed(1)}/5</Text>
                        {suggestion.priceLevel && (
                          <Text style={styles.priceText}>{'💵'.repeat(suggestion.priceLevel)}</Text>
                        )}
                        {suggestion.distance && (
                          <Text style={styles.distanceText}>{(suggestion.distance / 1000).toFixed(1)} km</Text>
                        )}
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.viewOnMapButton}
                      onPress={() => openInMaps(suggestion)}
                    >
                      <Text style={styles.viewOnMapText}>Xem trên Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <MapPin size={48} color="#ccc" />
                <Text style={styles.noResultsText}>Không tìm thấy địa điểm phù hợp</Text>
                <Text style={styles.noResultsSubtext}>
                  Thử lại hoặc liên hệ với các thành viên để cập nhật địa chỉ chính xác hơn.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={findSuitableLocations}
                >
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  content: {
    flex: 1,
  },
  groupInfo: {
    padding: 20,
  },
  groupInfoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  membersPreview: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  memberLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberLocationInfo: {
    flex: 1,
  },
  memberLocationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  memberLocationAddress: {
    fontSize: 12,
    color: '#666',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  searchDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#378699',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  suggestionsList: {
    gap: 16,
  },
  suggestionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  suggestionType: {
    fontSize: 12,
    color: '#378699',
    fontWeight: '500',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  mapsButton: {
    padding: 8,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
  },
  suggestionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionTime: {
    fontSize: 12,
    color: '#666',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 12,
  },
  viewOnMapButton: {
    backgroundColor: '#378699',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOnMapText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#378699',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 13,
    color: '#4CAF50',
  },
  distanceText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});