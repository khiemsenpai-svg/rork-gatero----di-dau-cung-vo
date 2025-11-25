import { router, Stack } from 'expo-router';
import { Users, MapPin, Calendar, Check, ArrowLeft, Edit3, Receipt, Camera, X, Plus, Minus } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
  PanResponder,
  SafeAreaView,
  TextInput,
  Switch,
  FlatList,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const SLOT_HEIGHT = 40; // Height for 30-minute slots
const DAY_WIDTH = (screenWidth - 80) / 7;

interface TimeSlot {
  day: number;
  hour: number;
  minute: number; // 0 or 30 for half-hour slots
  isAvailable: boolean;
}

export default function GroupDetailScreen() {
  const { user } = useAuth();
  const { currentGroup, updateMemberAvailability, updateMemberBudget, updateDesiredLocation, addBillToLedger, simplifyDebts, settleUpAll } = useGroups();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'add' | 'remove'>('add');
  const [activeTab, setActiveTab] = useState<'members' | 'requirements' | 'schedule' | 'gathering' | 'split'>('members');
  const [budgetMode, setBudgetMode] = useState<'average' | 'minimum'>('average');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  
  // Bill splitting state
  const [billImage, setBillImage] = useState<string | null>(null);
  const [billItems, setBillItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    assignedTo: string[];
    splitType: 'individual' | 'shared';
    customSplit?: { [memberId: string]: number };
  }>>([]);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [treatMode, setTreatMode] = useState<'split' | 'treat-all' | 'treat-partial'>('split');
  const [treatingMember, setTreatingMember] = useState<string | null>(null);
  const [treatPercentage, setTreatPercentage] = useState(100);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [processingLedger, setProcessingLedger] = useState(false);

  useEffect(() => {
    if (!currentGroup) {
      router.back();
    }
  }, [currentGroup]);

  if (!currentGroup) {
    return null;
  }

  // Get date range and time range from group settings or use defaults
  const getDateRange = () => {
    if (currentGroup.timeRange) {
      const startDate = new Date(currentGroup.timeRange.startDate);
      const endDate = new Date(currentGroup.timeRange.endDate);
      const dates = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    }
    
    // Default: next 7 days starting from today
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  const getTimeSlots = () => {
    if (currentGroup.timeRange) {
      const startHour = parseInt(currentGroup.timeRange.startTime.split(':')[0]);
      const endHour = parseInt(currentGroup.timeRange.endTime.split(':')[0]);
      const slots = [];
      
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push({ hour, minute: 0 });
        slots.push({ hour, minute: 30 });
      }
      return slots;
    }
    
    // Default: 9:00 - 21:00 with 30-minute intervals
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      slots.push({ hour, minute: 0 });
      slots.push({ hour, minute: 30 });
    }
    return slots;
  };
  
  const dateRange = getDateRange();
  const timeSlots = getTimeSlots();
  
  const formatDate = (date: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dayIndex = Math.floor(locationX / DAY_WIDTH);
      const slotIndex = Math.floor(locationY / SLOT_HEIGHT);
      
      if (dayIndex >= 0 && dayIndex < dateRange.length && slotIndex >= 0 && slotIndex < timeSlots.length) {
        const timeSlot = timeSlots[slotIndex];
        const existingSlot = selectedSlots.find(
          slot => slot.day === dayIndex && slot.hour === timeSlot.hour && slot.minute === timeSlot.minute
        );
        
        setSelectionMode(existingSlot ? 'remove' : 'add');
        setIsSelecting(true);
        toggleSlot(dayIndex, timeSlot.hour, timeSlot.minute);
      }
    },
    
    onPanResponderMove: (evt) => {
      if (!isSelecting) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const dayIndex = Math.floor(locationX / DAY_WIDTH);
      const slotIndex = Math.floor(locationY / SLOT_HEIGHT);
      
      if (dayIndex >= 0 && dayIndex < dateRange.length && slotIndex >= 0 && slotIndex < timeSlots.length) {
        const timeSlot = timeSlots[slotIndex];
        updateSlot(dayIndex, timeSlot.hour, timeSlot.minute, selectionMode === 'add');
      }
    },
    
    onPanResponderRelease: () => {
      setIsSelecting(false);
    },
  });

  const toggleSlot = (day: number, hour: number, minute: number) => {
    setSelectedSlots(prev => {
      const existing = prev.find(slot => slot.day === day && slot.hour === hour && slot.minute === minute);
      if (existing) {
        return prev.filter(slot => !(slot.day === day && slot.hour === hour && slot.minute === minute));
      } else {
        return [...prev, { day, hour, minute, isAvailable: true }];
      }
    });
  };

  const updateSlot = (day: number, hour: number, minute: number, isAvailable: boolean) => {
    setSelectedSlots(prev => {
      const filtered = prev.filter(slot => !(slot.day === day && slot.hour === hour && slot.minute === minute));
      if (isAvailable) {
        return [...filtered, { day, hour, minute, isAvailable: true }];
      }
      return filtered;
    });
  };

  const isSlotSelected = (day: number, hour: number, minute: number) => {
    return selectedSlots.some(slot => slot.day === day && slot.hour === hour && slot.minute === minute);
  };

  const handleSaveAvailability = async () => {
    try {
      const formattedSlots = selectedSlots.map(slot => {
        const date = dateRange[slot.day];
        const startMinute = slot.minute;
        const endMinute = slot.minute + 30;
        const endHour = endMinute >= 60 ? slot.hour + 1 : slot.hour;
        const finalEndMinute = endMinute >= 60 ? 0 : endMinute;
        
        return {
          day: date.toISOString().split('T')[0], // YYYY-MM-DD format
          startTime: `${slot.hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
          endTime: `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`,
          isAvailable: true,
        };
      });

      if (!user) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để thực hiện chức năng này');
        return;
      }
      
      await updateMemberAvailability(
        currentGroup.id,
        user.id,
        formattedSlots
      );

      Alert.alert('Thành công', 'Đã lưu lịch rảnh của bạn');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu lịch rảnh');
    }
  };

  const getMemberAvailabilityCount = (dayIndex: number, hour: number, minute: number) => {
    let count = 0;
    const targetDate = dateRange[dayIndex].toISOString().split('T')[0];
    const targetTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    currentGroup.members.forEach(member => {
      if (member.availableSlots?.some(slot => {
        if (slot.day !== targetDate) return false;
        
        const slotStart = slot.startTime;
        const slotEnd = slot.endTime;
        
        return slotStart <= targetTime && slotEnd > targetTime;
      })) {
        count++;
      }
    });
    return count;
  };

  const getSlotOpacity = (dayIndex: number, hour: number, minute: number) => {
    const count = getMemberAvailabilityCount(dayIndex, hour, minute);
    const maxMembers = currentGroup.members.length;
    return Math.max(0.1, count / maxMembers);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text testID="groupDetailSubtitle" style={styles.groupTitle}>CHI TIẾT NHÓM</Text>
          <Text testID="groupDetailName" style={styles.groupName}>{currentGroup.name}</Text>
          <Text style={styles.groupCode}>Mã nhóm: {currentGroup.code}</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'members', label: 'Thành viên', icon: Users, step: 1 },
            { id: 'requirements', label: 'Yêu cầu', icon: MapPin, step: 2 },
            { id: 'schedule', label: 'Lịch rảnh', icon: Calendar, step: 3 },
            { id: 'gathering', label: 'Tập hợp', icon: MapPin, step: 4 },
            { id: 'split', label: 'Chia tiền', icon: Receipt, step: 5 },
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item }) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(item.id as any)}
              >
                <View style={[styles.tabStepBadge, isActive && styles.tabStepBadgeActive]}>
                  <Text style={[styles.tabStepText, isActive && styles.tabStepTextActive]}>
                    {item.step}
                  </Text>
                </View>
                <View style={styles.tabContent}>
                  <Icon size={20} color={isActive ? '#378699' : '#999'} />
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {activeTab === 'members' ? (
        <ScrollView style={styles.content}>
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>
              Thành viên ({currentGroup.members.length}/{currentGroup.maxMembers})
            </Text>
            {currentGroup.members.map((member, index) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.name}
                    {member.id === currentGroup.hostId && (
                      <Text style={styles.hostLabel}> (Host)</Text>
                    )}
                  </Text>
                  <View style={styles.memberLocation}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.memberLocationText}>{member.location}</Text>
                  </View>
                </View>
                {member.availableSlots && member.availableSlots.length > 0 && (
                  <View style={styles.availabilityBadge}>
                    <Check size={14} color="#4CAF50" />
                    <Text style={styles.availabilityText}>Đã chọn lịch</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {currentGroup.hostId === user?.id && (
            <View style={styles.hostActions}>
              <Text style={styles.sectionTitle}>Quản lý nhóm</Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/find-location')}
              >
                <Text style={styles.actionButtonText}>Tìm địa điểm phù hợp</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'requirements' ? (
        <ScrollView style={styles.content}>
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>Yêu cầu về địa điểm</Text>
            <Text style={styles.sectionDescription}>
              Thông tin này sẽ giúp tìm địa điểm phù hợp với mọi người
            </Text>
            
            <View style={styles.requirementCard}>
              <View style={styles.requirementRow}>
                <View style={styles.requirementLabelContainer}>
                  <MapPin size={18} color="#378699" />
                  <Text style={styles.requirementLabel}>Địa điểm mong muốn</Text>
                </View>
                {currentGroup.hostId === user?.id ? (
                  isEditingLocation ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.input}
                        value={locationInput}
                        onChangeText={setLocationInput}
                        placeholder="Nhập địa điểm..."
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={async () => {
                            if (locationInput.trim()) {
                              await updateDesiredLocation(currentGroup.id, locationInput.trim());
                              setIsEditingLocation(false);
                              Alert.alert('Thành công', 'Đã cập nhật địa điểm');
                            }
                          }}
                        >
                          <Text style={styles.saveBtnText}>Lưu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => {
                            setIsEditingLocation(false);
                            setLocationInput(currentGroup.desiredLocation || '');
                          }}
                        >
                          <Text style={styles.cancelBtnText}>Hủy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.valueContainer}
                      onPress={() => {
                        setLocationInput(currentGroup.desiredLocation || '');
                        setIsEditingLocation(true);
                      }}
                    >
                      <Text style={currentGroup.desiredLocation ? styles.requirementValue : styles.requirementPlaceholder}>
                        {currentGroup.desiredLocation || 'Chưa cập nhật'}
                      </Text>
                      <Edit3 size={16} color="#378699" />
                    </TouchableOpacity>
                  )
                ) : (
                  <Text style={currentGroup.desiredLocation ? styles.requirementValue : styles.requirementPlaceholder}>
                    {currentGroup.desiredLocation || 'Chưa cập nhật'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.requirementCard}>
              <View style={styles.requirementRow}>
                <View style={styles.requirementLabelContainer}>
                  <Text style={styles.requirementLabel}>💰 Ngân sách</Text>
                </View>
                <View style={styles.budgetDisplay}>
                  <Text style={styles.budgetValue}>
                    {(() => {
                      const budgets = currentGroup.members
                        .map(m => m.budget)
                        .filter((b): b is number => b !== undefined && b > 0);
                      
                      if (budgets.length === 0) return 'Chưa có dữ liệu';
                      
                      if (budgetMode === 'average') {
                        const avg = budgets.reduce((a, b) => a + b, 0) / budgets.length;
                        return `${Math.round(avg).toLocaleString('vi-VN')}đ`;
                      } else {
                        const min = Math.min(...budgets);
                        return `${min.toLocaleString('vi-VN')}đ`;
                      }
                    })()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.budgetModeContainer}>
                <Text style={styles.budgetModeLabel}>Hiển thị:</Text>
                <View style={styles.budgetModeSwitch}>
                  <Text style={[styles.budgetModeText, budgetMode === 'minimum' && styles.budgetModeTextActive]}>
                    Thấp nhất
                  </Text>
                  <Switch
                    value={budgetMode === 'average'}
                    onValueChange={(value) => setBudgetMode(value ? 'average' : 'minimum')}
                    trackColor={{ false: '#ccc', true: '#378699' }}
                    thumbColor="white"
                  />
                  <Text style={[styles.budgetModeText, budgetMode === 'average' && styles.budgetModeTextActive]}>
                    Trung bình
                  </Text>
                </View>
              </View>
            </View>

            {user && currentGroup.members.some(m => m.id === user.id) && (
              <View style={styles.myBudgetCard}>
                <Text style={styles.myBudgetTitle}>Ngân sách của bạn</Text>
                {isEditingBudget ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.input}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      placeholder="Nhập ngân sách (VNĐ)..."
                      keyboardType="numeric"
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={async () => {
                          const budget = parseInt(budgetInput);
                          if (!isNaN(budget) && budget > 0) {
                            const currentMember = currentGroup.members.find(m => m.id === user.id);
                            if (currentMember) {
                              await updateMemberBudget(currentGroup.id, currentMember.id, budget);
                              setIsEditingBudget(false);
                              Alert.alert('Thành công', 'Đã cập nhật ngân sách của bạn');
                            }
                          } else {
                            Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
                          }
                        }}
                      >
                        <Text style={styles.saveBtnText}>Lưu</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                          setIsEditingBudget(false);
                          const currentMember = currentGroup.members.find(m => m.id === user.id);
                          setBudgetInput(currentMember?.budget?.toString() || '');
                        }}
                      >
                        <Text style={styles.cancelBtnText}>Hủy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.myBudgetButton}
                    onPress={() => {
                      const currentMember = currentGroup.members.find(m => m.id === user.id);
                      setBudgetInput(currentMember?.budget?.toString() || '');
                      setIsEditingBudget(true);
                    }}
                  >
                    <Text style={styles.myBudgetValue}>
                      {(() => {
                        const currentMember = currentGroup.members.find(m => m.id === user.id);
                        return currentMember?.budget 
                          ? `${currentMember.budget.toLocaleString('vi-VN')}đ`
                          : 'Chưa cập nhật';
                      })()}
                    </Text>
                    <Edit3 size={16} color="#378699" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      ) : activeTab === 'gathering' ? (
        <ScrollView style={styles.content}>
          <View style={styles.gatheringSection}>
            <Text style={styles.sectionTitle}>Quản lí nhóm: Tìm địa điểm phù hợp</Text>
            <Text style={styles.sectionDescription}>
              Sử dụng tính năng này để tìm địa điểm phù hợp với tất cả thành viên dựa trên vị trí và ngân sách của họ.
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/find-location')}
            >
              <MapPin size={20} color="white" />
              <Text style={styles.actionButtonText}>Tìm địa điểm phù hợp</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'split' ? (
        <ScrollView style={styles.content}>
          <View style={styles.splitSection}>
            <Text style={styles.sectionTitle}>Chia tiền hóa đơn</Text>
            <Text style={styles.sectionDescription}>
              Chụp ảnh hóa đơn hoặc nhập thủ công để chia tiền công bằng
            </Text>

            {/* Treat Mode Selection */}
            <View style={styles.treatModeCard}>
              <Text style={styles.treatModeTitle}>Chế độ thanh toán</Text>
              <View style={styles.treatModeOptions}>
                <TouchableOpacity
                  style={[styles.treatModeOption, treatMode === 'split' && styles.treatModeOptionActive]}
                  onPress={() => setTreatMode('split')}
                >
                  <Text style={[styles.treatModeOptionText, treatMode === 'split' && styles.treatModeOptionTextActive]}>
                    Chia đều nha!
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.treatModeOption, treatMode === 'treat-all' && styles.treatModeOptionActive]}
                  onPress={() => setTreatMode('treat-all')}
                >
                  <Text style={[styles.treatModeOptionText, treatMode === 'treat-all' && styles.treatModeOptionTextActive]}>
                    Để tui bao!
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.treatModeOption, treatMode === 'treat-partial' && styles.treatModeOptionActive]}
                  onPress={() => setTreatMode('treat-partial')}
                >
                  <Text style={[styles.treatModeOptionText, treatMode === 'treat-partial' && styles.treatModeOptionTextActive]}>
                    Tui trả 1 phần
                  </Text>
                </TouchableOpacity>
              </View>

              {treatMode !== 'split' && (
                <View style={styles.treatMemberSelection}>
                  <Text style={styles.treatMemberLabel}>Người treat:</Text>
                  <View style={styles.treatMemberList}>
                    {currentGroup.members.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.treatMemberChip, treatingMember === member.id && styles.treatMemberChipActive]}
                        onPress={() => setTreatingMember(member.id)}
                      >
                        <Text style={[styles.treatMemberChipText, treatingMember === member.id && styles.treatMemberChipTextActive]}>
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(treatMode === 'treat-partial' || treatMode === 'treat-all') && treatingMember && (
                    <View style={styles.treatPercentageContainer}>
                      <Text style={styles.treatPercentageLabel}>Phần trăm treat: {treatPercentage}%</Text>
                      <View style={styles.treatPercentageControls}>
                        <TouchableOpacity
                          style={styles.treatPercentageButton}
                          onPress={() => setTreatPercentage(Math.max(0, treatPercentage - 10))}
                        >
                          <Minus size={16} color="#378699" />
                        </TouchableOpacity>
                        <View style={styles.treatPercentageBar}>
                          <View style={[styles.treatPercentageFill, { width: `${treatPercentage}%` }]} />
                        </View>
                        <TouchableOpacity
                          style={styles.treatPercentageButton}
                          onPress={() => setTreatPercentage(Math.min(100, treatPercentage + 10))}
                        >
                          <Plus size={16} color="#378699" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Bill Image Upload */}
            <View style={styles.billUploadCard}>
              <Text style={styles.billUploadTitle}>Hóa đơn</Text>
              {!billImage ? (
                <TouchableOpacity
                  style={styles.billUploadButton}
                  onPress={async () => {
                    try {
                      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!permissionResult.granted) {
                        Alert.alert('Cần quyền', 'Vui lòng cấp quyền thư viện ảnh.');
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                      if (result.canceled || !result.assets[0]?.uri) return;
                      const uri = result.assets[0].uri;
                      setBillImage(uri);
                      try {
                        const schema = z.object({
                          items: z.array(z.object({ name: z.string(), price: z.number(), quantity: z.number().default(1) })).default([]),
                          vat: z.number().default(0),
                          service: z.number().default(0),
                        });
                        const parsed = await generateObject({
                          messages: [
                            { role: 'user', content: [
                              { type: 'text', text: 'Trích xuất các món từ ảnh hóa đơn tiếng Việt. Trả về JSON với items[{name, price, quantity}], vat (%), service (%)' },
                              { type: 'image', image: uri }
                            ]}
                          ],
                          schema,
                        });
                        const items = parsed.items ?? [];
                        const mapped = items.map((it: { name: string; price: number; quantity?: number }) => ({
                          id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                          name: it.name,
                          price: Number(it.price) || 0,
                          quantity: Number(it.quantity ?? 1) || 1,
                          assignedTo: [],
                          splitType: 'individual' as const,
                        }));
                        setBillItems(mapped);
                        setTax(Number(parsed.vat ?? 0));
                        setServiceCharge(Number(parsed.service ?? 0));
                        Alert.alert('Đã quét hóa đơn', `Nhận diện ${mapped.length} món`);
                      } catch (e) {
                        console.log('AI parse error', e);
                        Alert.alert('Lỗi AI', 'Không thể nhận diện hóa đơn. Bạn có thể nhập thủ công.');
                      }
                    } catch (err) {
                      Alert.alert('Lỗi', 'Không thể chọn ảnh');
                    }
                  }}
                >
                  <Camera size={32} color="#378699" />
                  <Text style={styles.billUploadText}>Chọn ảnh hóa đơn</Text>
                  <Text style={styles.billUploadHint}>AI sẽ tự động nhận diện món và thuế/phí</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.billImageContainer}>
                  <TouchableOpacity
                    style={styles.billImageRemove}
                    onPress={() => setBillImage(null)}
                  >
                    <X size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Manual Item Entry */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.manualEntryTitle}>Thêm món thủ công</Text>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={() => {
                  const newItem = {
                    id: Date.now().toString(),
                    name: 'Món mới',
                    price: 0,
                    quantity: 1,
                    assignedTo: [],
                    splitType: 'individual' as const,
                  };
                  setBillItems([...billItems, newItem]);
                }}
              >
                <Plus size={20} color="#378699" />
                <Text style={styles.addItemButtonText}>Thêm món</Text>
              </TouchableOpacity>
            </View>

            {/* Bill Items List */}
            {billItems.length > 0 && (
              <View style={styles.billItemsCard}>
                <Text style={styles.billItemsTitle}>Danh sách món ({billItems.length})</Text>
                {billItems.map((item, index) => (
                  <View key={item.id} style={styles.billItem}>
                    <View style={styles.billItemHeader}>
                      <TextInput
                        style={styles.billItemNameInput}
                        value={item.name}
                        onChangeText={(text) => {
                          const updated = [...billItems];
                          updated[index].name = text;
                          setBillItems(updated);
                        }}
                        placeholder="Tên món"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setBillItems(billItems.filter(i => i.id !== item.id));
                        }}
                      >
                        <X size={20} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.billItemDetails}>
                      <View style={styles.billItemPriceContainer}>
                        <Text style={styles.billItemLabel}>Giá:</Text>
                        <TextInput
                          style={styles.billItemPriceInput}
                          value={item.price.toString()}
                          onChangeText={(text) => {
                            const updated = [...billItems];
                            updated[index].price = parseFloat(text) || 0;
                            setBillItems(updated);
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                        <Text style={styles.billItemCurrency}>đ</Text>
                      </View>
                      <View style={styles.billItemQuantityContainer}>
                        <Text style={styles.billItemLabel}>SL:</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const updated = [...billItems];
                            updated[index].quantity = Math.max(1, item.quantity - 1);
                            setBillItems(updated);
                          }}
                        >
                          <Minus size={16} color="#378699" />
                        </TouchableOpacity>
                        <Text style={styles.billItemQuantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const updated = [...billItems];
                            updated[index].quantity += 1;
                            setBillItems(updated);
                          }}
                        >
                          <Plus size={16} color="#378699" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.billItemAssignment}>
                      <Text style={styles.billItemAssignmentLabel}>Gán cho:</Text>
                      <View style={styles.billItemMemberList}>
                        {currentGroup.members.map(member => {
                          const isAssigned = item.assignedTo.includes(member.id);
                          return (
                            <TouchableOpacity
                              key={member.id}
                              style={[styles.billItemMemberChip, isAssigned && styles.billItemMemberChipActive]}
                              onPress={() => {
                                const updated = [...billItems];
                                if (isAssigned) {
                                  updated[index].assignedTo = item.assignedTo.filter(id => id !== member.id);
                                } else {
                                  updated[index].assignedTo = [...item.assignedTo, member.id];
                                }
                                setBillItems(updated);
                              }}
                            >
                              <Text style={[styles.billItemMemberChipText, isAssigned && styles.billItemMemberChipTextActive]}>
                                {member.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    {item.assignedTo.length > 1 && (
                      <View style={styles.billItemSplitType}>
                        <TouchableOpacity
                          style={[styles.splitTypeButton, item.splitType === 'individual' && styles.splitTypeButtonActive]}
                          onPress={() => {
                            const updated = [...billItems];
                            updated[index].splitType = 'individual';
                            setBillItems(updated);
                          }}
                        >
                          <Text style={[styles.splitTypeButtonText, item.splitType === 'individual' && styles.splitTypeButtonTextActive]}>
                            Riêng
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.splitTypeButton, item.splitType === 'shared' && styles.splitTypeButtonActive]}
                          onPress={() => {
                            const updated = [...billItems];
                            updated[index].splitType = 'shared';
                            setBillItems(updated);
                          }}
                        >
                          <Text style={[styles.splitTypeButtonText, item.splitType === 'shared' && styles.splitTypeButtonTextActive]}>
                            Chia đều
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Tax and Service Charge */}
            {billItems.length > 0 && (
              <View style={styles.additionalChargesCard}>
                <Text style={styles.additionalChargesTitle}>Phí bổ sung</Text>
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>Thuế (%):</Text>
                  <TextInput
                    style={styles.chargeInput}
                    value={tax.toString()}
                    onChangeText={(text) => setTax(parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>Phí phục vụ (%):</Text>
                  <TextInput
                    style={styles.chargeInput}
                    value={serviceCharge.toString()}
                    onChangeText={(text) => setServiceCharge(parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
            )}

            {/* Summary */}
            {billItems.length > 0 && (
              <View style={styles.billSummaryCard}>
                <Text style={styles.billSummaryTitle}>Tổng kết</Text>
                {(() => {
                  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const taxAmount = subtotal * (tax / 100);
                  const serviceChargeAmount = subtotal * (serviceCharge / 100);
                  const total = subtotal + taxAmount + serviceChargeAmount;

                  const memberTotals: { [memberId: string]: number } = {};
                  currentGroup.members.forEach(member => {
                    memberTotals[member.id] = 0;
                  });

                  billItems.forEach(item => {
                    if (item.assignedTo.length === 0) return;
                    
                    const itemTotal = item.price * item.quantity;
                    if (item.splitType === 'shared') {
                      const perPerson = itemTotal / item.assignedTo.length;
                      item.assignedTo.forEach(memberId => {
                        memberTotals[memberId] += perPerson;
                      });
                    } else {
                      item.assignedTo.forEach(memberId => {
                        memberTotals[memberId] += itemTotal;
                      });
                    }
                  });

                  // Apply tax and service charge proportionally
                  Object.keys(memberTotals).forEach(memberId => {
                    const memberSubtotal = memberTotals[memberId];
                    const memberTax = memberSubtotal * (tax / 100);
                    const memberService = memberSubtotal * (serviceCharge / 100);
                    memberTotals[memberId] = memberSubtotal + memberTax + memberService;
                  });

                  // Apply treat mode
                  if ((treatMode === 'treat-all' || treatMode === 'treat-partial') && treatingMember) {
                    const percent = Math.max(0, Math.min(100, treatPercentage));
                    const treatAmount = total * (percent / 100);
                    const remainingAmount = total - treatAmount;
                    Object.keys(memberTotals).forEach(memberId => {
                      if (memberId === treatingMember) {
                        memberTotals[memberId] = treatAmount;
                      } else {
                        const proportion = subtotal > 0 ? (memberTotals[memberId] / subtotal) : 0;
                        memberTotals[memberId] = remainingAmount * proportion;
                      }
                    });
                  }

                  return (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tạm tính:</Text>
                        <Text style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')}đ</Text>
                      </View>
                      {tax > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Thuế ({tax}%):</Text>
                          <Text style={styles.summaryValue}>{taxAmount.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      )}
                      {serviceCharge > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Phí phục vụ ({serviceCharge}%):</Text>
                          <Text style={styles.summaryValue}>{serviceChargeAmount.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      )}
                      <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                        <Text style={styles.summaryLabelTotal}>Tổng cộng:</Text>
                        <Text style={styles.summaryValueTotal}>{total.toLocaleString('vi-VN')}đ</Text>
                      </View>

                      <View style={styles.memberSplitSection}>
                        <Text style={styles.memberSplitTitle}>Chi tiết từng người:</Text>
                        {currentGroup.members.map(member => (
                          <View key={member.id} style={styles.memberSplitRow}>
                            <View style={styles.memberSplitInfo}>
                              <Text style={styles.memberSplitName}>{member.name}</Text>
                              {member.id === treatingMember && treatMode !== 'split' && (
                                <Text style={styles.memberSplitBadge}>Treating</Text>
                              )}
                            </View>
                            <Text style={styles.memberSplitAmount}>
                              {(memberTotals[member.id] || 0).toLocaleString('vi-VN')}đ
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.paymentModeCard}>
                        <Text style={styles.paymentModeTitle}>Chọn hình thức</Text>
                        <View style={styles.payerRow}>
                          <Text style={styles.payerLabel}>Người trả tiền</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            {currentGroup.members.map(m => (
                              <TouchableOpacity key={m.id} style={[styles.payerChip, payerId === m.id && styles.payerChipActive]} onPress={() => setPayerId(m.id)}>
                                <Text style={[styles.payerChipText, payerId === m.id && styles.payerChipTextActive]}>{m.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                        <View style={styles.paymentButtonsRow}>
                          <TouchableOpacity
                            style={styles.settleNowButton}
                            onPress={() => {
                              if (!payerId) { Alert.alert('Chọn người trả', 'Vui lòng chọn người trả tiền trước'); return; }
                            }}
                          >
                            <Text style={styles.settleNowButtonText}>Trả ngay</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.ledgerButton, processingLedger && { opacity: 0.6 }]}
                            disabled={processingLedger}
                            onPress={async () => {
                              if (!payerId) { Alert.alert('Chọn người trả', 'Vui lòng chọn người trả tiền trước'); return; }
                              try {
                                setProcessingLedger(true);
                                await addBillToLedger(currentGroup.id, payerId, memberTotals, 'Bill từ tính năng Chia tiền');
                                Alert.alert('Đã ghi vào Sổ nợ', 'Mọi khoản nợ đã được cập nhật.');
                              } catch (e) {
                                Alert.alert('Lỗi', 'Không thể ghi vào Sổ nợ');
                              } finally {
                                setProcessingLedger(false);
                              }
                            }}
                          >
                            <Text style={styles.ledgerButtonText}>Ghi nợ nhóm</Text>
                          </TouchableOpacity>
                        </View>

                        {payerId && (
                          <View style={styles.qrPreviewBox}>
                            {user?.id === payerId && user?.qrBankImage ? (
                              <View style={{ alignItems: 'center', gap: 8 }}>
                                <Image source={{ uri: user.qrBankImage }} style={{ width: 220, height: 220, borderRadius: 12 }} />
                                <Text style={{ fontSize: 12, color: '#666' }}>QR của bạn</Text>
                              </View>
                            ) : (
                              <View style={{ gap: 8 }}>
                                <Text style={styles.qrHelpText}>Chưa có QR của người trả. Vào tab Cá nhân để cập nhật QR ngân hàng.</Text>
                                {user?.id === payerId && (
                                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={[styles.settleNowButton, { backgroundColor: '#378699' }]}> 
                                    <Text style={styles.settleNowButtonText}>Cập nhật QR của tôi</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                        )}

                        {currentGroup.ledger?.entries && currentGroup.ledger.entries.length > 0 && (
                          <View style={styles.debtSection}>
                            <Text style={styles.debtTitle}>Tối ưu nợ (Debt Simplification)</Text>
                            {(() => {
                              const settlements = simplifyDebts(currentGroup.id);
                              if (settlements.length === 0) {
                                return <Text style={styles.debtEmpty}>Không còn khoản nợ chưa tất toán</Text>;
                              }
                              return (
                                <View style={{ gap: 8 }}>
                                  {settlements.map((s, idx) => {
                                    const from = currentGroup.members.find(m => m.id === s.fromMemberId)?.name ?? 'Ẩn';
                                    const to = currentGroup.members.find(m => m.id === s.toMemberId)?.name ?? 'Ẩn';
                                    return (
                                      <View key={idx} style={styles.debtRow}>
                                        <Text style={styles.debtText}>{from} ➜ {to}</Text>
                                        <Text style={styles.debtAmount}>{s.amount.toLocaleString('vi-VN')}đ</Text>
                                      </View>
                                    );
                                  })}
                                  <TouchableOpacity style={styles.settleUpAllButton} onPress={() => settleUpAll(currentGroup.id)}>
                                    <Text style={styles.settleUpAllText}>Đánh dấu đã tất toán</Text>
                                  </TouchableOpacity>
                                </View>
                              );
                            })()}
                          </View>
                        )}
                      </View>

                      {/* Verification */}
                      {(() => {
                        const calculatedTotal = Object.values(memberTotals).reduce((sum, val) => sum + val, 0);
                        const difference = Math.abs(total - calculatedTotal);
                        if (difference > 1) {
                          return (
                            <View style={styles.verificationWarning}>
                              <Text style={styles.verificationWarningText}>
                                ⚠️ Chênh lệch: {difference.toFixed(0)}đ
                              </Text>
                            </View>
                          );
                        }
                        return (
                          <View style={styles.verificationSuccess}>
                            <Text style={styles.verificationSuccessText}>✓ Tổng khớp chính xác</Text>
                          </View>
                        );
                      })()}
                    </>
                  );
                })()}
              </View>
            )}

            {/* Payment QR Codes */}
            {billItems.length > 0 && (
              <View style={styles.paymentQRCard}>
                <Text style={styles.paymentQRTitle}>Thanh toán nhanh</Text>
                <Text style={styles.paymentQRDescription}>
                  Thành viên có thể thêm mã QR Momo, ZaloPay, Banking vào hồ sơ cá nhân để nhận tiền nhanh chóng
                </Text>
                <TouchableOpacity
                  style={styles.paymentQRButton}
                  onPress={() => {
                    Alert.alert('Tính năng sắp ra mắt', 'Tích hợp QR thanh toán sẽ được cập nhật trong phiên bản tiếp theo');
                  }}
                >
                  <Text style={styles.paymentQRButtonText}>Xem mã QR thành viên</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.scheduleContainer}>
          <ScrollView style={styles.scheduleContent} showsVerticalScrollIndicator={false}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleHeaderIcon}>
                <Calendar size={28} color="#378699" />
              </View>
              <Text style={styles.scheduleTitle}>Chọn thời gian rảnh của bạn</Text>
              <Text style={styles.scheduleHint}>
                Nhấn và kéo để chọn nhiều khung thời gian
              </Text>
            </View>

            {currentGroup.timeRange && (
              <View style={styles.timeRangeInfo}>
                <View style={styles.timeRangeRow}>
                  <View style={styles.timeRangeIconContainer}>
                    <Calendar size={18} color="#378699" />
                  </View>
                  <View style={styles.timeRangeTextContainer}>
                    <Text style={styles.timeRangeLabel}>Khoảng thời gian</Text>
                    <Text style={styles.timeRangeValue}>
                      {new Date(currentGroup.timeRange.startDate).toLocaleDateString('vi-VN')} - {new Date(currentGroup.timeRange.endDate).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                </View>
                <View style={styles.timeRangeDivider} />
                <View style={styles.timeRangeRow}>
                  <View style={styles.timeRangeIconContainer}>
                    <Text style={styles.timeRangeIcon}>🕐</Text>
                  </View>
                  <View style={styles.timeRangeTextContainer}>
                    <Text style={styles.timeRangeLabel}>Giờ hoạt động</Text>
                    <Text style={styles.timeRangeValue}>
                      {currentGroup.timeRange.startTime} - {currentGroup.timeRange.endTime}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.instructionCard}>
              <Text style={styles.instructionText}>Mỗi ô tương ứng với 30 phút</Text>
            </View>

            <View style={styles.timeGridWrapper}>
              <View style={styles.timeGrid}>
                <View style={styles.timeHeader}>
                  <View style={styles.timeCorner} />
                  {dateRange.map((date, index) => (
                    <View key={index} style={styles.dayHeader}>
                      <Text style={styles.dayText}>{formatDate(date)}</Text>
                    </View>
                  ))}
                </View>

                <ScrollView 
                  style={styles.timeBody}
                  showsVerticalScrollIndicator={false}
                >
                  <View {...panResponder.panHandlers} style={styles.panContainer}>
                    {timeSlots.map((timeSlot, slotIndex) => (
                      <View key={`${timeSlot.hour}-${timeSlot.minute}`} style={styles.timeRow}>
                        <View style={styles.hourLabel}>
                          <Text style={styles.hourText}>
                            {timeSlot.hour.toString().padStart(2, '0')}:{timeSlot.minute.toString().padStart(2, '0')}
                          </Text>
                        </View>
                        {dateRange.map((_, dayIndex) => {
                          const isSelected = isSlotSelected(dayIndex, timeSlot.hour, timeSlot.minute);
                          const availabilityCount = getMemberAvailabilityCount(dayIndex, timeSlot.hour, timeSlot.minute);
                          
                          return (
                            <TouchableOpacity
                              key={dayIndex}
                              style={[
                                styles.timeSlot,
                                isSelected && styles.selectedSlot,
                                availabilityCount > 0 && styles.hasAvailability,
                              ]}
                              onPress={() => toggleSlot(dayIndex, timeSlot.hour, timeSlot.minute)}
                              activeOpacity={0.7}
                            >
                              {availabilityCount > 0 && !isSelected && (
                                <View 
                                  style={[
                                    styles.availabilityIndicator,
                                    { opacity: getSlotOpacity(dayIndex, timeSlot.hour, timeSlot.minute) }
                                  ]}
                                />
                              )}
                              {availabilityCount > 0 && (
                                <Text style={[styles.availabilityCount, isSelected && styles.availabilityCountSelected]}>
                                  {availabilityCount}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.selectedColor]} />
                <Text style={styles.legendText}>Lịch rảnh của bạn</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, styles.availableColor]} />
                <Text style={styles.legendText}>Có người rảnh</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAvailability}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Lưu lịch rảnh</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#378699',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#378699',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1,
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    letterSpacing: 1,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  groupCode: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabsList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#E8F4F8',
    borderColor: '#378699',
  },
  tabStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabStepBadgeActive: {
    backgroundColor: '#378699',
  },
  tabStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  tabStepTextActive: {
    color: 'white',
  },
  tabContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#378699',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  membersSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  hostLabel: {
    fontSize: 12,
    color: '#378699',
    fontWeight: '600',
  },
  memberLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberLocationText: {
    fontSize: 14,
    color: '#666',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  hostActions: {
    marginTop: 32,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#378699',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scheduleContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scheduleHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  scheduleHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  scheduleHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  instructionText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
  },
  timeGridWrapper: {
    marginBottom: 20,
  },
  timeGrid: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#378699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  timeHeader: {
    flexDirection: 'row',
    backgroundColor: '#378699',
    borderBottomWidth: 0,
  },
  timeCorner: {
    width: 60,
    height: 56,
    backgroundColor: '#378699',
  },
  dayHeader: {
    width: DAY_WIDTH,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#378699',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  timeBody: {
    maxHeight: 400,
  },
  panContainer: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    height: SLOT_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  hourLabel: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
    backgroundColor: '#fafbfc',
    borderRightWidth: 2,
    borderRightColor: '#e8eaed',
  },
  hourText: {
    fontSize: 11,
    color: '#378699',
    fontWeight: '700',
  },
  timeSlot: {
    width: DAY_WIDTH,
    height: SLOT_HEIGHT,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'white',
  },
  selectedSlot: {
    backgroundColor: '#378699',
    borderWidth: 1,
    borderColor: '#2a6b7d',
  },
  hasAvailability: {
    backgroundColor: 'transparent',
  },
  availabilityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
  availabilityCount: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  availabilityCountSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeRangeInfo: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#378699',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeRangeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeIcon: {
    fontSize: 20,
  },
  timeRangeTextContainer: {
    flex: 1,
  },
  timeRangeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeRangeValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  timeRangeDivider: {
    height: 1,
    backgroundColor: '#e8eaed',
    marginVertical: 12,
  },
  saveButton: {
    backgroundColor: '#378699',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#378699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendColor: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedColor: {
    backgroundColor: '#378699',
    borderColor: '#2a6b7d',
  },
  availableColor: {
    backgroundColor: '#4CAF50',
    opacity: 0.6,
    borderColor: '#4CAF50',
  },
  legendText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  requirementsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  requirementCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  requirementRow: {
    gap: 12,
  },
  requirementLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  requirementValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  requirementPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editContainer: {
    gap: 10,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#378699',
    fontSize: 15,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#378699',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  budgetDisplay: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  budgetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#378699',
  },
  budgetModeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetModeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  budgetModeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetModeText: {
    fontSize: 13,
    color: '#999',
  },
  budgetModeTextActive: {
    color: '#378699',
    fontWeight: '600',
  },
  myBudgetCard: {
    backgroundColor: '#E8F4F8',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  myBudgetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#378699',
    marginBottom: 12,
  },
  myBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
  },
  myBudgetValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  gatheringSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  splitSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  treatModeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  treatModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  treatModeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  treatModeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  treatModeOptionActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  treatModeOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  treatModeOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  treatMemberSelection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  treatMemberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  treatMemberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  treatMemberChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  treatMemberChipActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  treatMemberChipText: {
    fontSize: 13,
    color: '#666',
  },
  treatMemberChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  treatPercentageContainer: {
    marginTop: 12,
  },
  treatPercentageLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  treatPercentageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  treatPercentageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#378699',
    justifyContent: 'center',
    alignItems: 'center',
  },
  treatPercentageBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  treatPercentageFill: {
    height: '100%',
    backgroundColor: '#378699',
  },
  billUploadCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  billUploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  billUploadButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#378699',
    borderStyle: 'dashed',
  },
  billUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378699',
    marginTop: 12,
  },
  billUploadHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  billImageContainer: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  billImageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  manualEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#378699',
  },
  addItemButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#378699',
  },
  billItemsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  billItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  billItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  billItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billItemNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginRight: 8,
  },
  billItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  billItemPriceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billItemLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  billItemPriceInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    fontWeight: '600',
  },
  billItemCurrency: {
    fontSize: 14,
    color: '#666',
  },
  billItemQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billItemQuantity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  billItemAssignment: {
    marginBottom: 12,
  },
  billItemAssignmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  billItemMemberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  billItemMemberChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  billItemMemberChipActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  billItemMemberChipText: {
    fontSize: 12,
    color: '#666',
  },
  billItemMemberChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  billItemSplitType: {
    flexDirection: 'row',
    gap: 8,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  splitTypeButtonActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  splitTypeButtonText: {
    fontSize: 13,
    color: '#666',
  },
  splitTypeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  additionalChargesCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  additionalChargesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chargeLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  chargeInput: {
    width: 80,
    fontSize: 15,
    color: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'right',
    fontWeight: '600',
  },
  billSummaryCard: {
    backgroundColor: '#E8F4F8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  billSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#378699',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#333',
  },
  summaryValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#378699',
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#378699',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#378699',
  },
  memberSplitSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 134, 153, 0.3)',
  },
  memberSplitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378699',
    marginBottom: 12,
  },
  memberSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 6,
  },
  memberSplitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberSplitName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  memberSplitBadge: {
    fontSize: 11,
    color: '#378699',
    backgroundColor: 'rgba(55, 134, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
  },
  memberSplitAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#378699',
  },
  verificationWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  verificationWarningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  verificationSuccess: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verificationSuccessText: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
    fontWeight: '600',
  },
  paymentModeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  paymentModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  payerRow: {
    marginTop: 4,
    marginBottom: 12,
  },
  payerLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  payerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  payerChipActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  payerChipText: {
    fontSize: 12,
    color: '#666',
  },
  payerChipTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  paymentButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qrPreviewBox: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrHelpText: {
    fontSize: 12,
    color: '#666',
  },
  settleNowButton: {
    flex: 1,
    backgroundColor: '#1f8f5f',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  settleNowButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  ledgerButton: {
    flex: 1,
    backgroundColor: '#133a4b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ledgerButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  debtSection: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debtTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  debtEmpty: {
    fontSize: 12,
    color: '#999',
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  debtText: {
    fontSize: 13,
    color: '#333',
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#378699',
  },
  settleUpAllButton: {
    marginTop: 8,
    backgroundColor: '#378699',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  settleUpAllText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentQRCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  paymentQRTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  paymentQRDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentQRButton: {
    backgroundColor: '#378699',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentQRButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});