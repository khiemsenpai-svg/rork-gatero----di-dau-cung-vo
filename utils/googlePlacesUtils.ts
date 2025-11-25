interface GooglePlace {
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
    open_now?: boolean;
  };
  price_level?: number;
  vicinity?: string;
  photos?: {
    photo_reference: string;
  }[];
}

export interface PlaceSearchResult {
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

function normalizeCategory(category: string): string {
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
    'trà sữa': 'milk tea',
    'trà': 'tea',
    'milk tea': 'milk tea',
    'công viên': 'park',
    'park': 'park',
    'shopping': 'shopping_mall',
    'mua sắm': 'shopping_mall',
    'trung tâm thương mại': 'shopping_mall',
    'siêu thị': 'supermarket',
    'gym': 'gym',
    'thể dục': 'gym',
    'spa': 'spa',
    'massage': 'spa',
    'bệnh viện': 'hospital',
    'ngân hàng': 'bank',
    'atm': 'atm',
    'khách sạn': 'lodging',
    'hotel': 'lodging',
    'bảo tàng': 'museum',
    'museum': 'museum',
    'rạp phim': 'movie_theater',
    'cinema': 'movie_theater',
    'phim': 'movie_theater',
    'phở': 'pho restaurant',
    'pho': 'pho restaurant',
    'bún': 'vietnamese restaurant',
    'bun': 'vietnamese restaurant',
    'bún bò huế': 'vietnamese restaurant',
    'bún chả': 'vietnamese restaurant',
    'bún riêu': 'vietnamese restaurant',
    'bún đậu': 'vietnamese restaurant',
    'cơm': 'vietnamese restaurant',
    'com': 'vietnamese restaurant',
    'cơm tấm': 'vietnamese restaurant',
    'com tam': 'vietnamese restaurant',
    'bánh mì': 'vietnamese restaurant',
    'banh mi': 'vietnamese restaurant',
    'hủ tiếu': 'vietnamese restaurant',
    'hu tieu': 'vietnamese restaurant',
    'mì': 'noodle restaurant',
    'mi': 'noodle restaurant',
    'mì quảng': 'vietnamese restaurant',
    'mi quang': 'vietnamese restaurant',
    'bánh xèo': 'vietnamese restaurant',
    'banh xeo': 'vietnamese restaurant',
    'gỏi cuốn': 'vietnamese restaurant',
    'goi cuon': 'vietnamese restaurant',
    'chả giò': 'vietnamese restaurant',
    'cha gio': 'vietnamese restaurant',
    'nem': 'vietnamese restaurant',
    'lẩu': 'hot pot restaurant',
    'lau': 'hot pot restaurant',
    'bánh cuốn': 'vietnamese restaurant',
    'banh cuon': 'vietnamese restaurant',
    'cao lầu': 'vietnamese restaurant',
    'cao lau': 'vietnamese restaurant',
    'bánh canh': 'vietnamese restaurant',
    'banh canh': 'vietnamese restaurant',
    'xôi': 'vietnamese restaurant',
    'xoi': 'vietnamese restaurant',
    'bánh bao': 'vietnamese restaurant',
    'banh bao': 'vietnamese restaurant',
    'chè': 'dessert shop',
    'che': 'dessert shop',
    'bánh flan': 'dessert shop',
    'banh flan': 'dessert shop',
    'flan': 'dessert shop',
    'bánh bèo': 'vietnamese restaurant',
    'banh beo': 'vietnamese restaurant',
    'nem nướng': 'vietnamese restaurant',
    'nem nuong': 'vietnamese restaurant',
    'bò bía': 'vietnamese restaurant',
    'bo bia': 'vietnamese restaurant',
    'cháo': 'vietnamese restaurant',
    'chao': 'vietnamese restaurant',
    'bò kho': 'vietnamese restaurant',
    'bo kho': 'vietnamese restaurant',
    'bánh tráng trộn': 'vietnamese restaurant',
    'banh trang tron': 'vietnamese restaurant',
    'bánh tráng': 'vietnamese restaurant',
    'banh trang': 'vietnamese restaurant',
    'bánh khọt': 'vietnamese restaurant',
    'banh khot': 'vietnamese restaurant',
    'nước ép': 'juice bar',
    'nuoc ep': 'juice bar',
    'sinh tố': 'juice bar',
    'sinh to': 'juice bar',
    'ốc': 'seafood restaurant',
    'oc': 'seafood restaurant',
    'hải sản': 'seafood restaurant',
    'hai san': 'seafood restaurant',
    'seafood': 'seafood restaurant',
    'nướng': 'bbq restaurant',
    'nuong': 'bbq restaurant',
    'bbq': 'bbq restaurant',
    'thịt nướng': 'bbq restaurant',
    'dimsum': 'chinese restaurant',
    'dim sum': 'chinese restaurant',
    'miến': 'vietnamese restaurant',
    'mien': 'vietnamese restaurant',
    'canh': 'vietnamese restaurant',
    'soup': 'vietnamese restaurant',
    'cá': 'seafood restaurant',
    'ca': 'seafood restaurant',
    'fish': 'seafood restaurant',
    'gà': 'chicken restaurant',
    'ga': 'chicken restaurant',
    'chicken': 'chicken restaurant',
    'gà rán': 'fried chicken',
    'ga ran': 'fried chicken',
    'sườn': 'bbq restaurant',
    'suon': 'bbq restaurant',
    'ribs': 'bbq restaurant',
    'bò': 'beef restaurant',
    'bo': 'beef restaurant',
    'beef': 'beef restaurant',
    'tôm': 'seafood restaurant',
    'tom': 'seafood restaurant',
    'shrimp': 'seafood restaurant',
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || category;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Convert to meters
}

export async function searchGooglePlacesByCategory(
  category: string,
  locationLat: number,
  locationLng: number,
  radius: number = 5000
): Promise<PlaceSearchResult[]> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found');
      return [];
    }

    const normalizedCategory = normalizeCategory(category);
    const location = `${locationLat},${locationLng}`;
    
    // First try text search with the category
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(normalizedCategory)}&location=${location}&radius=${radius}&language=vi&key=${apiKey}`;
    
    console.log('🔍 Searching Google Places (Text Search):', {
      category,
      normalizedCategory,
      lat: locationLat,
      lng: locationLng,
      radius: `${radius}m`
    });

    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 Google Places Response:', data.status, 'Results:', data.results?.length || 0);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const places: PlaceSearchResult[] = data.results.map((place: GooglePlace) => {
        const photoUrl = place.photos?.[0]?.photo_reference 
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
          : undefined;

        const distance = calculateDistance(locationLat, locationLng, place.geometry.location.lat, place.geometry.location.lng);

        return {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity || '',
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now,
          priceLevel: place.price_level,
          types: place.types,
          photoUrl,
          distance,
        };
      });

      // Sort by distance
      places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      return places.slice(0, 20);
    }

    // If text search didn't return results, try nearby search
    console.log('⚠️ Text search returned no results, trying nearby search...');
    
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&keyword=${encodeURIComponent(normalizedCategory)}&language=vi&key=${apiKey}`;
    
    const nearbyResponse = await fetch(url);
    const nearbyData = await nearbyResponse.json();
    
    console.log('📡 Google Places Nearby Response:', nearbyData.status, 'Results:', nearbyData.results?.length || 0);
    
    if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
      const places: PlaceSearchResult[] = nearbyData.results.map((place: GooglePlace) => {
        const photoUrl = place.photos?.[0]?.photo_reference 
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
          : undefined;

        const distance = calculateDistance(locationLat, locationLng, place.geometry.location.lat, place.geometry.location.lng);

        return {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity || '',
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now,
          priceLevel: place.price_level,
          types: place.types,
          photoUrl,
          distance,
        };
      });

      // Sort by distance
      places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      return places.slice(0, 20);
    }

    console.warn('⚠️ No places found via Google Places API');
    return [];
  } catch (error) {
    console.error('❌ Error searching Google Places:', error);
    return [];
  }
}

export async function searchGooglePlacesByName(
  query: string,
  locationLat?: number,
  locationLng?: number,
  radius: number = 50000
): Promise<PlaceSearchResult[]> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found');
      return [];
    }

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=vi&key=${apiKey}`;
    
    if (locationLat && locationLng) {
      const location = `${locationLat},${locationLng}`;
      url += `&location=${location}&radius=${radius}`;
      console.log('🔍 Searching Google Places (Name):', query, 'near', location, 'radius:', `${radius}m`);
    } else {
      console.log('🔍 Searching Google Places (Name):', query, 'without location filter');
    }

    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 Google Places Response:', data.status, 'Results:', data.results?.length || 0);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const places: PlaceSearchResult[] = data.results.map((place: GooglePlace) => {
        const photoUrl = place.photos?.[0]?.photo_reference 
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
          : undefined;

        let distance: number | undefined;
        if (locationLat && locationLng) {
          distance = calculateDistance(locationLat, locationLng, place.geometry.location.lat, place.geometry.location.lng);
        }

        return {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || place.vicinity || '',
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          isOpen: place.opening_hours?.open_now,
          priceLevel: place.price_level,
          types: place.types,
          photoUrl,
          distance,
        };
      });

      // Sort by distance if available
      if (locationLat && locationLng) {
        places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
      
      return places.slice(0, 20);
    }

    console.warn('⚠️ No places found via Google Places API');
    return [];
  } catch (error) {
    console.error('❌ Error searching Google Places:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,opening_hours,price_level,types,photos&language=vi&key=${apiKey}`;
    
    console.log('🔍 Getting Google Place Details:', placeId);

    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📡 Google Place Details Response:', data.status);

    if (data.status === 'OK' && data.result) {
      const place = data.result;
      const photoUrl = place.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
        : undefined;

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || '',
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        isOpen: place.opening_hours?.open_now,
        priceLevel: place.price_level,
        types: place.types,
        photoUrl,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting place details:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Places API key not found');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=vi&key=${apiKey}`;
    
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