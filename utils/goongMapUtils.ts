interface GoongPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  opening_hours?: {
    open_now: boolean;
  };
}

interface GoongSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string;
  placeId: string;
  rating?: number;
  openNow?: boolean;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const goongApiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!goongApiKey) {
      console.warn('Goong API key not found');
      return null;
    }

    const url = `https://rsapi.goong.io/v2/geocode?address=${encodeURIComponent(address)}&api_key=${goongApiKey}`;
    
    console.log('🔍 Geocoding address:', address);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✅ Geocode result:', location.lat, location.lng);
      return { lat: location.lat, lng: location.lng };
    }
    
    console.warn('⚠️ No geocode results found');
    return null;
  } catch (error) {
    console.error('❌ Error geocoding address:', error);
    return null;
  }
}

export function normalizeCategoryKeyword(category: string): string {
  const categoryMap: Record<string, string> = {
    'cafe': 'cafe',
    'cà phê': 'cafe',
    'coffee': 'cafe',
    'quán cafe': 'cafe',
    'quán cà phê': 'cafe',
    'nhà hàng': 'restaurant',
    'quán ăn': 'restaurant',
    'restaurant': 'restaurant',
    'ăn trưa': 'restaurant',
    'ăn tối': 'restaurant',
    'bar': 'bar',
    'pub': 'bar',
    'nhậu': 'bar',
    'bia': 'bar',
    'karaoke': 'karaoke',
    'trà sữa': 'trà sữa',
    'trà': 'trà sữa',
    'milk tea': 'trà sữa',
    'công viên': 'park',
    'park': 'park',
    'shopping': 'shopping',
    'mua sắm': 'shopping',
    'trung tâm thương mại': 'mall',
    'siêu thị': 'supermarket',
    'gym': 'gym',
    'thể dục': 'gym',
    'spa': 'spa',
    'massage': 'massage',
    'bệnh viện': 'hospital',
    'ngân hàng': 'bank',
    'atm': 'atm',
    'khách sạn': 'hotel',
    'hotel': 'hotel',
    'bảo tàng': 'museum',
    'museum': 'museum',
    'rạp phim': 'cinema',
    'cinema': 'cinema',
    'phim': 'cinema',
    'phở': 'phở',
    'pho': 'phở',
    'bún': 'bún',
    'bun': 'bún',
    'bún bò huế': 'bún bò huế',
    'bún chả': 'bún chả',
    'bún riêu': 'bún riêu',
    'bún đậu': 'bún đậu',
    'cơm': 'cơm',
    'com': 'cơm',
    'cơm tấm': 'cơm tấm',
    'com tam': 'cơm tấm',
    'bánh mì': 'bánh mì',
    'banh mi': 'bánh mì',
    'hủ tiếu': 'hủ tiếu',
    'hu tieu': 'hủ tiếu',
    'mì': 'mì',
    'mi': 'mì',
    'mì quảng': 'mì quảng',
    'mi quang': 'mì quảng',
    'bánh xèo': 'bánh xèo',
    'banh xeo': 'bánh xèo',
    'gỏi cuốn': 'gỏi cuốn',
    'goi cuon': 'gỏi cuốn',
    'chả giò': 'chả giò',
    'cha gio': 'chả giò',
    'nem': 'nem',
    'lẩu': 'lẩu',
    'lau': 'lẩu',
    'bánh cuốn': 'bánh cuốn',
    'banh cuon': 'bánh cuốn',
    'cao lầu': 'cao lầu',
    'cao lau': 'cao lầu',
    'bánh canh': 'bánh canh',
    'banh canh': 'bánh canh',
    'xôi': 'xôi',
    'xoi': 'xôi',
    'bánh bao': 'bánh bao',
    'banh bao': 'bánh bao',
    'chè': 'chè',
    'che': 'chè',
    'bánh flan': 'bánh flan',
    'banh flan': 'bánh flan',
    'flan': 'bánh flan',
    'bánh bèo': 'bánh bèo',
    'banh beo': 'bánh bèo',
    'nem nướng': 'nem nướng',
    'nem nuong': 'nem nướng',
    'bò bía': 'bò bía',
    'bo bia': 'bò bía',
    'cháo': 'cháo',
    'chao': 'cháo',
    'bò kho': 'bò kho',
    'bo kho': 'bò kho',
    'bánh tráng trộn': 'bánh tráng',
    'banh trang tron': 'bánh tráng',
    'bánh tráng': 'bánh tráng',
    'banh trang': 'bánh tráng',
    'bánh khọt': 'bánh khọt',
    'banh khot': 'bánh khọt',
    'nước ép': 'nước ép',
    'nuoc ep': 'nước ép',
    'sinh tố': 'sinh tố',
    'sinh to': 'sinh tố',
    'ốc': 'ốc',
    'oc': 'ốc',
    'hải sản': 'hải sản',
    'hai san': 'hải sản',
    'seafood': 'hải sản',
    'nướng': 'nướng',
    'nuong': 'nướng',
    'bbq': 'nướng',
    'thịt nướng': 'nướng',
    'dimsum': 'dimsum',
    'dim sum': 'dimsum',
    'miến': 'miến',
    'mien': 'miến',
    'canh': 'canh',
    'soup': 'canh',
    'cá': 'cá',
    'ca': 'cá',
    'fish': 'cá',
    'gà': 'gà',
    'ga': 'gà',
    'chicken': 'gà',
    'gà rán': 'gà rán',
    'ga ran': 'gà rán',
    'sườn': 'sườn',
    'suon': 'sườn',
    'ribs': 'sườn',
    'bò': 'bò',
    'bo': 'bò',
    'beef': 'bò',
    'tôm': 'tôm',
    'tom': 'tôm',
    'shrimp': 'tôm',
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || category;
}

export async function searchGoongPlacesByCategory(
  category: string,
  locationLat: number,
  locationLng: number,
  radius: number = 15000
): Promise<GoongSearchResult[]> {
  try {
    const goongApiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!goongApiKey) {
      console.warn('Goong API key not found');
      return [];
    }

    const normalizedKeyword = normalizeCategoryKeyword(category);
    const origin = `${locationLat},${locationLng}`;
    const radiusKm = Math.round(radius / 1000);
    
    const url = `https://rsapi.goong.io/v2/place/autocomplete?input=${encodeURIComponent(normalizedKeyword)}&location=${origin}&radius=${radiusKm}&limit=20&origin=${origin}&more_compound=true&api_key=${goongApiKey}`;
    
    console.log('🔍 Searching Goong Autocomplete (Category):', { 
      category, 
      normalizedKeyword,
      lat: locationLat, 
      lng: locationLng, 
      radius: `${radius}m (${radiusKm}km)` 
    });
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 Goong Autocomplete Response:', data.status, 'Predictions:', data.predictions?.length || 0);
    
    if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
      const detailedPlaces: GoongSearchResult[] = [];
      
      for (const prediction of data.predictions.slice(0, 10)) {
        try {
          const detailUrl = `https://rsapi.goong.io/place/detail?place_id=${prediction.place_id}&api_key=${goongApiKey}`;
          const detailResponse = await fetch(detailUrl);
          const detailData = await detailResponse.json();
          
          if (detailData.status === 'OK' && detailData.result) {
            const place: GoongPlace = detailData.result;
            detailedPlaces.push({
              name: place.name,
              address: place.formatted_address,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              types: place.types?.join(', ') || normalizedKeyword,
              placeId: place.place_id,
              rating: place.rating,
              openNow: place.opening_hours?.open_now,
            });
          }
        } catch (err) {
          console.error('Error fetching place detail:', err);
        }
      }
      
      return detailedPlaces;
    }
    
    console.warn('⚠️ No places found via Autocomplete');
    return [];
  } catch (error) {
    console.error('❌ Error searching Goong Autocomplete:', error);
    return [];
  }
}

export async function searchGoongPlaces(
  query: string,
  locationLat?: number,
  locationLng?: number,
  radius: number = 50000
): Promise<GoongSearchResult[]> {
  try {
    const goongApiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!goongApiKey) {
      console.warn('Goong API key not found');
      return [];
    }

    let url = `https://rsapi.goong.io/v2/place/autocomplete?api_key=${goongApiKey}&input=${encodeURIComponent(query)}`;
    
    if (locationLat && locationLng) {
      const origin = `${locationLat},${locationLng}`;
      url += `&location=${origin}&radius=${radius / 1000}&origin=${origin}&more_compound=true`;
      console.log('🔍 Searching Goong (Name):', query, 'near', origin, 'radius:', `${radius / 1000}km`);
    } else {
      console.log('🔍 Searching Goong (Name):', query, 'without location filter');
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 Goong Search Response:', data.status, 'Predictions:', data.predictions?.length || 0);
    
    if (data.status === 'OK' && data.predictions) {
      const detailedPlaces: GoongSearchResult[] = [];
      
      for (const prediction of data.predictions.slice(0, 8)) {
        try {
          const detailUrl = `https://rsapi.goong.io/place/detail?place_id=${prediction.place_id}&api_key=${goongApiKey}`;
          const detailResponse = await fetch(detailUrl);
          const detailData = await detailResponse.json();
          
          if (detailData.status === 'OK' && detailData.result) {
            const place: GoongPlace = detailData.result;
            detailedPlaces.push({
              name: place.name,
              address: place.formatted_address,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              types: place.types?.join(', ') || 'Địa điểm',
              placeId: place.place_id,
              rating: place.rating,
              openNow: place.opening_hours?.open_now,
            });
          }
        } catch (err) {
          console.error('Error fetching place detail:', err);
        }
      }
      
      return detailedPlaces;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching Goong:', error);
    return [];
  }
}

export function getGoongMapUrl(lat: number, lng: number, name?: string): string {
  return `https://map.goong.io/?pid=${lat},${lng}&name=${encodeURIComponent(name || '')}`;
}

export function getGoogleMapsFallbackUrl(lat: number, lng: number, name?: string): string {
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

interface GoongDirectionsStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  html_instructions: string;
  polyline: { points: string };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
}

interface GoongDirectionsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_address: string;
  end_address: string;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  steps: GoongDirectionsStep[];
}

interface GoongDirectionsRoute {
  legs: GoongDirectionsLeg[];
  overview_polyline: { points: string };
  summary: string;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface GoongDirectionsResponse {
  routes: GoongDirectionsRoute[];
  status: string;
}

export interface DirectionsResult {
  distance: string;
  duration: string;
  steps: {
    instruction: string;
    distance: string;
    duration: string;
  }[];
  polyline: string;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export async function getGoongDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  vehicle: 'car' | 'bike' | 'taxi' | 'hd' = 'car'
): Promise<DirectionsResult | null> {
  try {
    const goongApiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
    if (!goongApiKey) {
      console.warn('Goong API key not found');
      return null;
    }

    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;
    const url = `https://rsapi.goong.io/Direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${goongApiKey}`;
    
    console.log('Fetching directions from Goong:', { origin, destination, vehicle });
    
    const response = await fetch(url);
    const data: GoongDirectionsResponse = await response.json();
    
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
        })),
        polyline: route.overview_polyline.points,
        bounds: route.bounds,
      };
    }
    
    console.warn('No routes found:', data.status);
    return null;
  } catch (error) {
    console.error('Error fetching Goong directions:', error);
    return null;
  }
}

export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const poly: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return poly;
}
