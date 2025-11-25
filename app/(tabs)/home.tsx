import { Mic, Send, MapPin, Navigation, X, MapPinOff, RefreshCw } from 'lucide-react-native';
import React, { useState, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Modal,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { createRorkTool, useRorkAgent } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { searchGoongPlaces, searchGoongPlacesByCategory, geocodeAddress, normalizeCategoryKeyword } from '@/utils/goongMapUtils';
import GoongMap from '@/components/GoongMap';
import { useUserLocation } from '@/hooks/useUserLocation';

interface LocationResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string;
}

type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'location'; locations: LocationResult[] };

interface Message {
  id: string;
  parts: MessagePart[];
  isUser: boolean;
  timestamp: Date;
}

interface UserInfo {
  name?: string;
  age?: number;
  gender?: 'male' | 'female';
  preferences?: string[];
  mood?: string;
  location?: string;
  interests?: string[];
  previousPlaces?: string[];
  budget?: string;
  groupSize?: string;
  occasion?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const { location: userLocation, error: locationError, permissionStatus, refreshLocation, requestPermission } = useUserLocation();
  const userLocationRef = useRef(userLocation);
  const [showLocationConsent, setShowLocationConsent] = useState<boolean>(false);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (locationError && permissionStatus !== 'granted') {
      setShowLocationConsent(true);
    } else {
      setShowLocationConsent(false);
    }
  }, [locationError, permissionStatus]);

  const agentResult = useRorkAgent({
    tools: {
      searchLocation: createRorkTool({
        description: `Tìm kiếm địa điểm thật ở Việt Nam với Goong Maps API theo FLOW CHUẨN.

QUAN TRỌNG:
- BẮT BUỘC sử dụng tool này khi người dùng hỏi về địa điểm (quán ăn, cafe, bar, địa điểm vui chơi, v.v.)
- KHÔNG BAO GIỜ bảo người dùng "tự tìm Google", "gặp vấn đề kỹ thuật", "hệ thống lag" - đó là nhiệm vụ của bạn!
- SAU KHI TOOL TRẢ VỀ KẾT QUẢ: Bạn PHẢI phản hồi bằng text để giới thiệu địa điểm. Đừng im lặng!

📋 FLOW CHUẨN (theo gợi ý Goong):
1. NLU: Phân tích câu hỏi → loại địa điểm (category) + khu vực (area)
2. Resolve khu vực:
   - Nếu có GPS: dùng GPS
   - Nếu user nói "Quận 3", "Bình Thạnh": dùng Geocode để lấy lat,lng
3. Gọi Autocomplete với:
   - input = CHỈ keyword loại địa điểm ("cafe", "nhà hàng") - ĐỪNG TRỘN khu vực vào!
   - location + radius = khu vực đã resolve

CÁCH DÙNG:
- searchType "category": Tìm LOẠI địa điểm chung (cafe, nhà hàng, bar)
  → Tool sẽ chuẩn hóa từ khóa ("quán cafe" → "cafe", "ăn trưa" → "restaurant")
- searchType "name": Tìm TÊN QUÁN CỤ THỂ (The Coffee House, Phở 24)
- location: Khu vực ("Quận 1, Hồ Chí Minh", "Bình Thạnh, TP.HCM")
  → Tool sẽ Geocode địa chỉ này thành lat,lng

VÍ DỤ ĐÚNG:
❌ SAI: query="quán cafe quận 3" (trộn khu vực vào query)
✅ ĐÚNG: query="cafe", location="Quận 3, Hồ Chí Minh"

- "tìm quán cafe" → {searchType: "category", query: "cafe"}
- "tìm cafe ở Quận 1" → {searchType: "category", query: "cafe", location: "Quận 1, Hồ Chí Minh"}
- "nhà hàng Bình Thạnh" → {searchType: "category", query: "nhà hàng", location: "Bình Thạnh, TP.HCM"}
- "tìm Highlands Coffee" → {searchType: "name", query: "Highlands Coffee"}`,
        zodSchema: z.object({
          searchType: z.enum(['category', 'name']).describe('"category" = tìm LOẠI địa điểm chung (cafe, nhà hàng, bar). "name" = tìm TÊN QUÁN CỤ THỂ (The Coffee House)'),
          query: z.string().describe('CHỈ TỪ KHÓA LOẠI ĐỊA ĐIỂM hoặc TÊN QUÁN. VD: "cafe", "nhà hàng", "The Coffee House". ĐỪNG TRỘN KHU VỰC vào đây!'),
          location: z.string().optional().describe('Khu vực/địa chỉ (VD: "Quận 1, Hồ Chí Minh", "Bình Thạnh, TP.HCM"). Chỉ dùng khi người dùng nói rõ hoặc không có GPS'),
          radius: z.number().optional().describe('Bán kính tìm kiếm (mét). Mặc định: 15000m cho category, 50000m cho name'),
        }),
        async execute(input) {
          const currentLocation = userLocationRef.current;
          
          console.log('\n🔍 ===== TOOL searchLocation (FLOW MỚI) =====');
          console.log('📝 Search Type:', input.searchType);
          console.log('📝 Query (keyword only):', input.query);
          console.log('📝 Location param:', input.location || 'none');
          console.log('📍 User GPS:', currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : '❌ NOT AVAILABLE');
          console.log('📏 Radius:', input.radius || 'default');
          console.log('=============================================\n');

          let searchLat: number;
          let searchLng: number;
          let results: any[] = [];

          // BƯỚC 1: Resolve khu vực → tọa độ
          if (input.location) {
            // User cung cấp địa chỉ/khu vực → Geocode
            console.log('🌍 Geocoding location:', input.location);
            const geocoded = await geocodeAddress(input.location);
            
            if (!geocoded) {
              return JSON.stringify({ 
                success: false, 
                message: `Không tìm thấy khu vực "${input.location}". Bạn có thể thử lại với địa chỉ cụ thể hơn không? (VD: "Quận 1, Hồ Chí Minh")`,
                locations: [] 
              });
            }
            
            searchLat = geocoded.lat;
            searchLng = geocoded.lng;
            console.log('✅ Geocoded to:', searchLat, searchLng);
          } else if (currentLocation) {
            // Dùng GPS
            searchLat = currentLocation.latitude;
            searchLng = currentLocation.longitude;
            console.log('✅ Using GPS:', searchLat, searchLng);
          } else {
            // Không có GPS và không có location
            return JSON.stringify({ 
              success: false, 
              message: 'Bạn chưa cho tôi biết khu vực nào để tìm. Bạn muốn tìm ở đâu? (VD: Quận 1, Bình Thạnh, Thủ Đức...)',
              needLocation: true,
              locations: [] 
            });
          }

          // BƯỚC 2: Gọi Autocomplete với keyword + location + radius
          if (input.searchType === 'category') {
            // Chuẩn hóa từ khóa category
            const normalizedQuery = normalizeCategoryKeyword(input.query);
            console.log('📚 Normalized keyword:', input.query, '→', normalizedQuery);
            
            results = await searchGoongPlacesByCategory(
              normalizedQuery,
              searchLat,
              searchLng,
              input.radius || 15000
            );
          } else {
            // Tìm theo tên cụ thể
            results = await searchGoongPlaces(
              input.query, 
              searchLat, 
              searchLng,
              input.radius || 50000
            );
          }
          
          console.log('\n✅ ===== TOOL RESULTS =====');
          console.log('📊 Total results:', results.length);
          if (results.length > 0) {
            console.log('📍 First result:', results[0].name, '-', results[0].address);
          }
          console.log('============================\n');
          
          // BƯỚC 3: Trả kết quả
          if (results.length === 0) {
            const radiusKm = (input.radius || (input.searchType === 'category' ? 15000 : 50000)) / 1000;
            if (input.searchType === 'category') {
              return JSON.stringify({ 
                success: false, 
                message: `Không tìm thấy ${input.query} trong bán kính ${radiusKm}km. Thử mở rộng bán kính hoặc đổi từ khóa?`,
                locations: [] 
              });
            } else {
              return JSON.stringify({ 
                success: false, 
                message: `Không tìm thấy "${input.query}" trong bán kính ${radiusKm}km. Thử tìm loại địa điểm chung hơn? (VD: cafe, nhà hàng)`,
                locations: [] 
              });
            }
          }
          
          const locations = results.map(r => ({
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            types: r.types,
            rating: r.rating,
            openNow: r.openNow,
          }));
          
          return JSON.stringify({ success: true, locations, count: locations.length });
        },
      }),
    },
  });

  const agentMessages = agentResult.messages;
  const agentSendMessage = agentResult.sendMessage;
  const isLoading = agentMessages.some(m => {
    if (m.role !== 'assistant') return false;
    const hasText = m.parts.some(p => p.type === 'text');
    const hasToolCalling = m.parts.some(p => p.type === 'tool' && (p.state === 'input-streaming' || p.state === 'input-available'));
    return hasToolCalling && !hasText;
  });

  const messages: Message[] = agentMessages
    .filter(msg => msg.id !== 'system-instructions')
    .map((msg) => {
      const parts: MessagePart[] = [];
      
      for (const part of msg.parts) {
        if (part.type === 'text') {
          parts.push({ type: 'text', text: part.text });
        } else if (part.type === 'tool' && part.state === 'output-available') {
          if (part.toolName === 'searchLocation' && part.output) {
            try {
              const parsed = JSON.parse(part.output as string);
              if (parsed.locations) {
                parts.push({ type: 'location', locations: parsed.locations });
              }
            } catch (e) {
              console.error('Error parsing tool output:', e);
            }
          }
        }
      }
      
      return {
        id: msg.id,
        parts,
        isUser: msg.role === 'user',
        timestamp: new Date(Date.now()),
      };
    });

  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      setKeyboardVisible(true);
      const height = event?.endCoordinates?.height ?? 0;
      const adjustedHeight = height * 0.23;
      Animated.timing(keyboardHeight, {
        duration: event?.duration || 250,
        toValue: adjustedHeight,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    };

    const keyboardWillHide = (event: any) => {
      setKeyboardVisible(false);
      Animated.timing(keyboardHeight, {
        duration: event?.duration || 250,
        toValue: 0,
        useNativeDriver: false,
      }).start();
    };

    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showListener, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideListener, keyboardWillHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setUserInfo(prev => ({
      ...prev,
      name: user?.displayName || user?.name || prev.name,
      age: user?.age || prev.age,
      gender: user?.gender || prev.gender,
    }));
  }, [user?.age, user?.gender, user?.displayName, user?.name]);

  useEffect(() => {
    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user?.displayName, agentMessages.length]);

  useEffect(() => {
    if (userLocation) {
      console.log('📍 User location updated:', userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation]);

  const getRandomGreeting = () => {
    const display = userInfo.name || user?.displayName || user?.name || 'bạn';
    const hasName = userInfo.name || user?.displayName || user?.name;
    const age = userInfo.age || user?.age;
    const gender = userInfo.gender || user?.gender;
    
    if (!hasName || !age || !gender) {
      return `Chào ${display}! Tui là Ngài Garott – người bạn cứu tinh chuyện đi chơi. Cho tui xin tuổi và giới tính để xưng hô cho đúng nhé!`;
    }
    
    const isYoung = age < 25;
    const isMale = gender === 'male';
    
    const greetings = isYoung ? [
      isMale ? `Ê ${display}! Hôm nay đi đâu chơi không anh bạn?` : `Hế lô ${display}! Hôm nay đi đâu chơi không chị gái?`,
      isMale ? `Ông ${display} ơi! Có kế hoạch gì vui không?` : `Bà ${display} ơi! Có kế hoạch gì vui không?`,
      isMale ? `Yo bro ${display}! Cuối tuần này làm gì đây?` : `Chào chị ${display}! Cuối tuần này làm gì đây?`,
      isMale ? `${display} ơi! Tui đang nghĩ anh bạn cần đi chơi rồi đấy!` : `${display} ơi! Tui đang nghĩ chị gái cần đi chơi rồi đấy!`,
      isMale ? `Alo ${display}! Ông có muốn khám phá chỗ mới không?` : `Alo ${display}! Bà có muốn khám phá chỗ mới không?`,
      isMale ? `Chào anh bạn ${display}! Hôm nay tâm trạng thế nào?` : `Chào chị gái ${display}! Hôm nay tâm trạng thế nào?`,
      isMale ? `${display} đây rồi! Bro muốn đi đâu hôm nay?` : `${display} đây rồi! Chị muốn đi đâu hôm nay?`,
      isMale ? `Ê ông ${display}! Tui có mấy chỗ hay lắm đây!` : `Ê bà ${display}! Tui có mấy chỗ hay lắm đây!`,
    ] : [
      isMale ? `Chào quý ông ${display}! Hôm nay muốn đi đâu thư giãn không ạ?` : `Chào quý cô ${display}! Hôm nay muốn đi đâu thư giãn không ạ?`,
      isMale ? `Kính chào ${display}! Tôi có thể giúp gì cho quý ông hôm nay?` : `Kính chào ${display}! Tôi có thể giúp gì cho quý cô hôm nay?`,
      isMale ? `Xin chào quý ngài ${display}! Có kế hoạch gì thú vị không?` : `Xin chào quý cô ${display}! Có kế hoạch gì thú vị không?`,
      isMale ? `${display} ơi! Quý ông muốn khám phá địa điểm mới không?` : `${display} ơi! Quý cô muốn khám phá địa điểm mới không?`,
      isMale ? `Chào mừng trở lại ${display}! Hôm nay quý ông cần gợi ý gì?` : `Chào mừng trở lại ${display}! Hôm nay quý cô cần gợi ý gì?`,
      isMale ? `Kính chào quý ông ${display}! Tôi sẵn sàng tư vấn cho quý ông.` : `Kính chào quý cô ${display}! Tôi sẵn sàng tư vấn cho quý cô.`,
      isMale ? `${display} ơi! Quý ngài có muốn tìm chỗ đặc biệt không?` : `${display} ơi! Quý cô có muốn tìm chỗ đặc biệt không?`,
    ];
    
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  };

  const getSystemInstructions = () => {
    const display = userInfo.name || user?.displayName || user?.name || 'bạn';
    const age = userInfo.age || user?.age;
    const gender = userInfo.gender || user?.gender;
    
    const isYoung = age && age < 25;
    const isMale = gender === 'male';
    
    let personalityTone = '';
    
    if (!age || !gender) {
      personalityTone = 'Hãy xưng hô thân thiện. Hỏi tuổi và giới tính người dùng để xưng hô cho đúng.';
    } else if (isYoung) {
      if (isMale) {
        personalityTone = 'Xưng hô "tui" cho mình, "anh bạn/bro/ông" cho người dùng. Nói thân thiện, hơi hài hước, phong cách Gen Z.';
      } else {
        personalityTone = 'Xưng hô "tui" cho mình, "chị gái/bà" cho người dùng. Nói thân thiện, hơi hài hước, phong cách Gen Z.';
      }
    } else {
      if (isMale) {
        personalityTone = 'Xưng hô "tôi" cho mình, "quý ông/quý ngài" cho người dùng. Nói lịch sự, chuyên nghiệp, tôn trọng.';
      } else {
        personalityTone = 'Xưng hô "tôi" cho mình, "quý cô" cho người dùng. Nói lịch sự, chuyên nghiệp, tôn trọng.';
      }
    }
    
    let locationInfo = '';
    if (userLocation) {
      locationInfo = `\n\n🎯 VỊ TRÍ GPS CÓ SẴN:\n- Tọa độ: ${userLocation.latitude}, ${userLocation.longitude}\n- Độ chính xác: ${userLocation.accuracy ? Math.round(userLocation.accuracy) + 'm' : 'cao'}\n\n✅ Khi người dùng hỏi địa điểm, dùng tool searchLocation để tìm gần họ!`;
    } else {
      locationInfo = `\n\n⚠️ GPS KHÔNG KHẢ DỤNG\n- Người dùng chưa bật GPS hoặc không cho phép\n- KHI người dùng hỏi về địa điểm: HÃY HỎI KHU VỰC/ĐỊA ĐIỂM CỤ THỂ\n- VD: "Bạn muốn tìm ở khu vực nào? Quận 1, Bình Thạnh, hay Thủ Đức?"\n- SAU đó dùng tool searchLocation với parameter "location" (VD: location: "Quận 1, Hồ Chí Minh")`;
    }
    
    return `BẠN LÀ: Ngài Garott - AI tư vấn địa điểm THẬT ở Việt Nam.

⚠️ QUY TẮC VÀNG - TUÂN THỦ TUYỆT ĐỐI:

🔴 CẤM TUYỆT ĐỐI:
1. KHÔNG được tự nghĩ ra địa điểm, tên quán, địa chỉ giả
2. KHÔNG được nói "tôi biết có quán X..." nếu chưa gọi tool
3. KHÔNG được nói "hệ thống lag/lỗi/không tìm được"
4. KHÔNG được bảo người dùng "tự search Google"

✅ BẮT BUỘC:
- KHI người dùng hỏi: "tìm cafe", "quán ăn", "nhà hàng", "bar", "địa điểm X"
- BẠN PHẢI: GỌI TOOL searchLocation theo FLOW CHUẨN
- SAU đó: Viết 1 câu ngắn giới thiệu

📋 FLOW CHUẨN KHI GỌI TOOL:
1. NLU: Phân tích câu hỏi
   - Loại địa điểm: "cafe", "nhà hàng", "bar", "trà sữa"...
   - Khu vực: "Quận 1", "Bình Thạnh", "gần tôi"...

2. Gọi tool với params đúng:
   ❌ SAI: query="quán cafe quận 3" (trộn khu vực vào query)
   ✅ ĐÚNG: query="cafe", location="Quận 3, Hồ Chí Minh"

3. Tool sẽ:
   - Geocode khu vực thành tọa độ (nếu có location param)
   - Hoặc dùng GPS (nếu không có location param)
   - Gọi Goong Autocomplete với keyword + location + radius

TÍNH CÁCH: ${personalityTone}${locationInfo}

📚 VÍ DỤ CÁCH LÀM ĐÚNG:

Ví dụ 1 (có GPS):
User: "Tìm quán cafe gần đây"
Garott: [Gọi tool {searchType: "category", query: "cafe"}]
→ Tool dùng GPS của user
Garott: "Đây nè! Tui tìm được mấy quán cafe xịn quanh đây 😎"

Ví dụ 2 (user nói khu vực):
User: "Tìm nhà hàng ở Quận 1"
Garott: [Gọi tool {searchType: "category", query: "nhà hàng", location: "Quận 1, Hồ Chí Minh"}]
→ Tool Geocode "Quận 1" thành lat,lng → tìm kiếm
Garott: "Tìm được rồi! Đây là mấy nhà hàng ngon ở Quận 1 nè 🍜"

Ví dụ 3 (không có GPS, user chưa nói khu vực):
User: "Tìm quán cafe"
Garott: [Gọi tool {searchType: "category", query: "cafe"}]
→ Tool thấy không có GPS và không có location → hỏi lại
Garott: "Bạn muốn tìm cafe ở khu vực nào? Quận 1, Bình Thạnh, hay đâu?"

Ví dụ 4 (tìm tên cụ thể):
User: "Tìm Highlands Coffee"
Garott: [Gọi tool {searchType: "name", query: "Highlands Coffee"}]
Garott: "Tìm được Highlands Coffee rồi đây! 🎉"

❌ VÍ DỤ SAI (ĐỪNG BAO GIỜ LÀM):

User: "Tìm cafe Quận 3"
Garott: [Gọi tool {query: "cafe quận 3"}] ← SAI! Phải tách riêng!
ĐÚNG: {query: "cafe", location: "Quận 3, Hồ Chí Minh"}

User: "Tìm quán cafe"
Garott: "Tui biết có The Coffee House..." ← SAI! Chưa gọi tool!

User: "Nhà hàng quanh đây"
Garott: "Ủa hệ thống lag..." ← SAI! Phải gọi tool!

🛠️ CÁCH DÙNG TOOL searchLocation:
- searchType: "category" = Tìm LOẠI địa điểm (cafe, nhà hàng, bar)
  → Tool tự chuẩn hóa từ khóa ("quán cafe" → "cafe")
- searchType: "name" = Tìm TÊN CỤ THỂ (Highlands, Phở 24)
- query: CHỈ từ khóa loại hoặc tên - ĐỪNG TRỘN khu vực!
- location: Khu vực ("Quận 1, Hồ Chí Minh") - Tool sẽ Geocode

THÔNG TIN USER:
Tên: ${display} | Tuổi: ${age || '?'} | Giới tính: ${gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : '?'}
${userInfo.mood ? `Tâm trạng: ${userInfo.mood}` : ''}
${userInfo.interests?.length ? `Sở thích: ${userInfo.interests.join(', ')}` : ''}

🎯 NHIỆM VỤ: Tìm địa điểm THẬT bằng tool theo FLOW CHUẨN, KHÔNG tự bịa!`;
  };

  const initializeChat = () => {
    if (messages.length === 0 && agentMessages.length === 0) {
      const greeting = getRandomGreeting();
      const systemInstructions = getSystemInstructions();
      
      agentResult.setMessages([
        {
          id: 'system-instructions',
          role: 'user',
          parts: [{ type: 'text', text: systemInstructions }]
        },
        {
          id: 'initial-greeting',
          role: 'assistant',
          parts: [{ type: 'text', text: greeting }]
        }
      ]);
    }
  };

  const openMap = (location: LocationResult) => {
    setSelectedLocation(location);
  };

  const closeMap = () => {
    setSelectedLocation(null);
  };

  const handleRequestLocation = async () => {
    setShowLocationConsent(false);
    if (permissionStatus === 'denied') {
      if (Platform.OS !== 'web') {
        await Location.requestForegroundPermissionsAsync();
      }
      refreshLocation();
    } else {
      await requestPermission();
      refreshLocation();
    }
  };

  const handleDismissConsent = () => {
    setShowLocationConsent(false);
  };

  const renderMessageParts = (parts: MessagePart[], isUser: boolean) => {
    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            let displayText = part.text;
            if (isUser) {
              displayText = part.text.replace(/\n\n\[Vị trí người dùng:.*?\]/g, '');
            }
            return (
              <Text 
                key={`text-${index}`} 
                style={isUser ? styles.userText : styles.messageTextContent}
              >
                {displayText}
              </Text>
            );
          } else if (part.type === 'location') {
            return (
              <View key={`locations-${index}`} style={styles.locationsContainer}>
                {part.locations.map((location, locIndex) => (
                  <TouchableOpacity
                    key={`loc-${locIndex}`}
                    onPress={() => openMap(location)}
                    style={styles.locationCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationCardHeader}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Navigation size={20} color="#378699" />
                    </View>
                    <View style={styles.locationCardBody}>
                      <MapPin size={14} color="#666" />
                      <Text style={styles.locationAddress}>{location.address}</Text>
                    </View>
                    <View style={styles.locationCardFooter}>
                      <Text style={styles.locationTypes}>{location.types}</Text>
                      <Text style={styles.mapLinkText}>Nhấn để xem bản đồ</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          }
          return null;
        })}
      </>
    );
  };

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setInputText('');

    const updatedInfo: Partial<UserInfo> = { ...userInfo };
    
    if (!userInfo.age) {
      const ageMatch = trimmed.match(/\b(\d{1,2})\s*tuổi|tuổi\s*(\d{1,2})|năm\s*(\d{1,2})|^(\d{1,2})$/i);
      if (ageMatch) {
        const age = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3] || ageMatch[4], 10);
        if (!Number.isNaN(age) && age >= 10 && age <= 100) {
          updatedInfo.age = age;
        }
      }
    }
    
    if (!userInfo.gender) {
      if (/(\b|\s)(nam|trai|con trai|boy|male)(\b|\s)/i.test(trimmed)) {
        updatedInfo.gender = 'male';
      } else if (/(\b|\s)(nữ|gái|con gái|girl|female)(\b|\s)/i.test(trimmed)) {
        updatedInfo.gender = 'female';
      }
    }
    
    if (/(buồn|chán|sad|bored|mệt|tired)/i.test(trimmed)) {
      updatedInfo.mood = 'buồn chán';
    } else if (/(vui|happy|hạnh phúc|phấn khích|excited)/i.test(trimmed)) {
      updatedInfo.mood = 'vui vẻ';
    } else if (/(stress|căng thẳng|áp lực)/i.test(trimmed)) {
      updatedInfo.mood = 'căng thẳng';
    }
    
    const interests: string[] = [];
    if (/(ăn|food|món|nhà hàng|quán)/i.test(trimmed)) interests.push('ẩm thực');
    if (/(cafe|cà phê|coffee|trà)/i.test(trimmed)) interests.push('cafe');
    if (/(phim|cinema|rạp|movie)/i.test(trimmed)) interests.push('xem phim');
    if (/(mua sắm|shopping|shop|mall)/i.test(trimmed)) interests.push('mua sắm');
    if (/(bar|pub|bia|rượu|nhậu)/i.test(trimmed)) interests.push('bar/pub');
    if (/(công viên|park|thiên nhiên|nature)/i.test(trimmed)) interests.push('thiên nhiên');
    
    if (interests.length > 0) {
      updatedInfo.interests = [...(updatedInfo.interests || []), ...interests];
      updatedInfo.interests = Array.from(new Set(updatedInfo.interests));
    }
    
    const locationKeywords = trimmed.match(/(quận \d+|q\d+|quận [\w\s]+|tp\.?\s*[\w\s]+|hà nội|sài gòn|hcm|đà nẵng|hồ chí minh|thành phố hồ chí minh|tp hcm|tphcm)/gi);
    if (locationKeywords) {
      updatedInfo.location = locationKeywords[0];
    }
    
    if (/(rẻ|bình dân|tiết kiệm|budget|cheap)/i.test(trimmed)) {
      updatedInfo.budget = 'bình dân';
    } else if (/(sang|cao cấp|luxury|đắt|xịn)/i.test(trimmed)) {
      updatedInfo.budget = 'cao cấp';
    } else if (/(trung bình|vừa phải|moderate)/i.test(trimmed)) {
      updatedInfo.budget = 'trung bình';
    }
    
    const groupMatch = trimmed.match(/(\d+)\s*(người|bạn|đứa)/i);
    if (groupMatch) {
      updatedInfo.groupSize = groupMatch[1] + ' người';
    } else if (/(một mình|solo|alone)/i.test(trimmed)) {
      updatedInfo.groupSize = '1 người';
    } else if (/(cặp|đôi|couple|hai người)/i.test(trimmed)) {
      updatedInfo.groupSize = '2 người';
    } else if (/(nhóm|group|đám|bọn)/i.test(trimmed)) {
      updatedInfo.groupSize = 'nhóm';
    }
    
    if (/(sinh nhật|birthday)/i.test(trimmed)) {
      updatedInfo.occasion = 'sinh nhật';
    } else if (/(hẹn hò|date|romantic)/i.test(trimmed)) {
      updatedInfo.occasion = 'hẹn hò';
    } else if (/(họp mặt|gặp gỡ|reunion)/i.test(trimmed)) {
      updatedInfo.occasion = 'họp mặt';
    }
    
    setUserInfo(updatedInfo);

    console.log('\n📤 ===== USER MESSAGE =====');
    console.log('User input:', trimmed);
    console.log('User location available:', userLocation ? 'YES ✅' : 'NO ❌');
    if (userLocation) {
      console.log('GPS:', `${userLocation.latitude}, ${userLocation.longitude}`);
    }
    console.log('===========================\n');

    let messageToSend = trimmed;

    try {
      await agentSendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (selectedLocation) {
    return (
      <TabScreenWrapper>
        <View style={styles.mapContainer}>
          <TouchableOpacity style={styles.closeMapButton} onPress={closeMap}>
            <X size={24} color="white" />
          </TouchableOpacity>
          <GoongMap
            destinationLat={selectedLocation.lat}
            destinationLng={selectedLocation.lng}
            destinationName={selectedLocation.name}
          />
        </View>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            keyboardVisible && { paddingBottom: 200 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.garrottIntro}>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ustht7j2m8w9of7t2641x' }}
              style={styles.garrottAvatar}
              resizeMode="contain"
            />
            <Text style={styles.garrottName}>Ngài Garott</Text>
            <Text style={styles.garrottDescription}>Người bạn cứu tinh của bạn</Text>
          </View>

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              {!message.isUser && (
                <Image
                  source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ustht7j2m8w9of7t2641x' }}
                  style={styles.messageAvatar}
                  resizeMode="contain"
                />
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <View style={styles.messageTextWrapper}>
                  {renderMessageParts(message.parts, message.isUser)}
                </View>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ustht7j2m8w9of7t2641x' }}
                style={styles.messageAvatar}
                resizeMode="contain"
              />
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                <Text style={styles.loadingText}>Đang tìm địa điểm...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {showLocationConsent && (
          <Modal
            visible={showLocationConsent}
            transparent
            animationType="fade"
            onRequestClose={handleDismissConsent}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.consentModal}>
                <View style={styles.consentIconContainer}>
                  <MapPinOff size={48} color="#378699" />
                </View>
                <Text style={styles.consentTitle}>Cần quyền truy cập vị trí</Text>
                <Text style={styles.consentMessage}>
                  {permissionStatus === 'denied'
                    ? 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật quyền trong cài đặt thiết bị để Garott có thể tìm địa điểm gần bạn.'
                    : 'Garott cần quyền truy cập vị trí của bạn để tìm kiếm các địa điểm gần bạn nhất.'}
                </Text>
                <View style={styles.consentButtons}>
                  {permissionStatus === 'denied' && Platform.OS !== 'web' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.consentButton, styles.consentButtonSecondary]}
                        onPress={handleDismissConsent}
                      >
                        <Text style={styles.consentButtonTextSecondary}>Để sau</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.consentButton, styles.consentButtonPrimary]}
                        onPress={() => {
                          handleDismissConsent();
                          Linking.openSettings();
                        }}
                      >
                        <Text style={styles.consentButtonTextPrimary}>Mở cài đặt</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.consentButton, styles.consentButtonSecondary]}
                        onPress={handleDismissConsent}
                      >
                        <Text style={styles.consentButtonTextSecondary}>Không, cảm ơn</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.consentButton, styles.consentButtonPrimary]}
                        onPress={handleRequestLocation}
                      >
                        <Text style={styles.consentButtonTextPrimary}>Cho phép</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          </Modal>
        )}

        <Animated.View
          style={[
            styles.inputContainer,
            { 
              bottom: keyboardHeight
            }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhắn tin với Ngài Garott..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              testID="home-chat-input"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            {!userLocation && (
              <TouchableOpacity
                style={styles.micButton}
                onPress={() => {
                  refreshLocation();
                  setShowLocationConsent(true);
                }}
                testID="home-location-button"
              >
                <RefreshCw size={20} color="#ff6b6b" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => {
                console.log('Voice recording not implemented yet');
              }}
              testID="home-mic-button"
            >
              <Mic size={20} color="#378699" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              testID="home-send-button"
            >
              <Send size={20} color={inputText.trim() ? 'white' : '#ccc'} />
            </TouchableOpacity>
          </View>
        </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 120,
  },
  garrottIntro: {
    alignItems: 'center' as const,
    marginBottom: 32,
    paddingTop: 20,
  },
  garrottAvatar: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  garrottName: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#378699',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  garrottDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  messageContainer: {
    flexDirection: 'row' as const,
    marginBottom: 16,
    alignItems: 'flex-end' as const,
  },
  userMessage: {
    justifyContent: 'flex-end' as const,
  },
  aiMessage: {
    justifyContent: 'flex-start' as const,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#378699',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageTextWrapper: {
    flex: 1,
  },
  messageTextContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loadingBubble: {
    minWidth: 160,
  },
  inputContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    backgroundColor: '#f9f9f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    color: '#333',
  },
  micButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: '#378699',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  locationsContainer: {
    marginTop: 8,
    gap: 12,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#378699',
    shadowColor: '#378699',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  locationCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  locationName: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '700' as const,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationCardBody: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 10,
  },
  locationAddress: {
    color: '#666',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  locationCardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  locationTypes: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  mapLinkText: {
    color: '#378699',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  mapContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  closeMapButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#378699',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  consentModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  consentIconContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    textAlign: 'center' as const,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  consentMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  consentButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  consentButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  consentButtonPrimary: {
    backgroundColor: '#378699',
  },
  consentButtonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  consentButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  consentButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
