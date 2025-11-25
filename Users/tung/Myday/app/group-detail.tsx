import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Users, MapPin, Calendar, Settings, Clock, Edit3, FileText, DollarSign } from 'lucide-react-native';
import CalendarSync from '@/components/CalendarSync';
import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';

interface TimeSlot {
  day: number;
  hour: number;
  minute: number;
}

interface MemberAvailability {
  memberId: string;
  memberName: string;
  availableSlots: TimeSlot[];
}

interface MemberRequirement {
  memberId: string;
  memberName: string;
  preferredLocation: string;
  budget: string;
  additionalNotes: string;
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const { currentGroup, updateMemberBudget, updateDesiredLocation, updateHostRequirements, updateMemberRequirements } = useGroups();
  const { user } = useAuth();
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'requirements' | 'schedule' | 'gathering' | 'split'>('members');
  const [userRequirement, setUserRequirement] = useState<MemberRequirement>({
    memberId: user?.id || '1',
    memberName: user?.displayName || user?.name || 'Bạn',
    preferredLocation: '',
    budget: '',
    additionalNotes: ''
  });
  const [budgetDisplay, setBudgetDisplay] = useState<'average' | 'minimum'>('average');
  const isTestingRoom = currentGroup?.code === '363636';
  const isHost = isTestingRoom || currentGroup?.hostId === user?.id;
  const [hostProposedLocation, setHostProposedLocation] = useState(currentGroup?.hostPreferredLocation || '');
  const [hostNotes, setHostNotes] = useState(currentGroup?.hostNotes || '');
  const [memberNotes, setMemberNotes] = useState('');
  const [memberPreferredLocation, setMemberPreferredLocation] = useState('');
  const [paymentMode, setPaymentMode] = useState<'split' | 'treat-all' | 'treat-partial'>('split');

  // Host's proposed event details
  const eventDetails = useMemo(() => ({
    name: 'Họp gia đình',
    proposedDates: [
      new Date('2025-01-20'),
      new Date('2025-01-21'),
      new Date('2025-01-22')
    ],
    startTime: { hour: 9, minute: 0 },
    endTime: { hour: 18, minute: 0 },
    duration: 2 // hours
  }), []);

  const memberRequirements: MemberRequirement[] = currentGroup?.members
    .filter(m => m.id !== user?.id && m.budget)
    .map(m => ({
      memberId: m.id,
      memberName: m.name,
      preferredLocation: '',
      budget: m.budget?.toString() || '',
      additionalNotes: ''
    })) || [];

  const calculateBudget = () => {
    const budgets = memberRequirements
      .map(req => parseFloat(req.budget))
      .filter(b => !isNaN(b) && b > 0);
    
    if (userRequirement.budget) {
      const userBudgetNum = parseFloat(userRequirement.budget);
      if (!isNaN(userBudgetNum) && userBudgetNum > 0) {
        budgets.push(userBudgetNum);
      }
    }

    if (budgets.length === 0) return null;

    if (budgetDisplay === 'average') {
      const avg = budgets.reduce((a, b) => a + b, 0) / budgets.length;
      return Math.round(avg);
    } else {
      return Math.min(...budgets);
    }
  };

  const displayBudget = calculateBudget();
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Mock member availability data
  const memberAvailabilities: MemberAvailability[] = [
    {
      memberId: '2',
      memberName: 'Minh',
      availableSlots: [
        { day: 0, hour: 10, minute: 0 },
        { day: 0, hour: 10, minute: 30 },
        { day: 0, hour: 11, minute: 0 },
        { day: 1, hour: 14, minute: 0 },
        { day: 1, hour: 14, minute: 30 },
        { day: 2, hour: 9, minute: 0 },
        { day: 2, hour: 9, minute: 30 }
      ]
    },
    {
      memberId: '3',
      memberName: 'Lan',
      availableSlots: [
        { day: 0, hour: 10, minute: 0 },
        { day: 0, hour: 10, minute: 30 },
        { day: 1, hour: 14, minute: 0 },
        { day: 1, hour: 15, minute: 0 },
        { day: 2, hour: 16, minute: 0 },
        { day: 2, hour: 16, minute: 30 }
      ]
    },
    {
      memberId: '4',
      memberName: 'Hùng',
      availableSlots: [
        { day: 0, hour: 9, minute: 0 },
        { day: 0, hour: 9, minute: 30 },
        { day: 0, hour: 10, minute: 0 },
        { day: 1, hour: 14, minute: 0 },
        { day: 2, hour: 11, minute: 0 },
        { day: 2, hour: 11, minute: 30 }
      ]
    }
  ];

  // Generate time slots based on host's proposed times (30-minute intervals)
  const getTimeSlots = useCallback(() => {
    const slots = [];
    const { startTime, endTime } = eventDetails;
    
    for (let hour = startTime.hour; hour <= endTime.hour; hour++) {
      const startMinute = hour === startTime.hour ? startTime.minute : 0;
      const endMinute = hour === endTime.hour ? endTime.minute : 60;
      
      for (let minute = startMinute; minute < endMinute; minute += 30) {
        if (hour < endTime.hour || (hour === endTime.hour && minute < endTime.minute)) {
          slots.push({ hour, minute });
        }
      }
    }
    return slots;
  }, [eventDetails]);

  const timeSlots = useMemo(() => getTimeSlots(), [getTimeSlots]);
  const dateRange = eventDetails.proposedDates;

  const isSlotSelected = useCallback((day: number, hour: number, minute: number) => {
    return selectedSlots.some(
      slot => slot.day === day && slot.hour === hour && slot.minute === minute
    );
  }, [selectedSlots]);

  const toggleSlot = useCallback((day: number, hour: number, minute: number) => {
    setSelectedSlots(prev => {
      const exists = prev.some(
        slot => slot.day === day && slot.hour === hour && slot.minute === minute
      );
      
      if (exists) {
        return prev.filter(
          slot => !(slot.day === day && slot.hour === hour && slot.minute === minute)
        );
      } else {
        return [...prev, { day, hour, minute }];
      }
    });
  }, []);



  const getMemberAvailabilityCount = (day: number, hour: number, minute: number) => {
    return memberAvailabilities.filter(member =>
      member.availableSlots.some(
        slot => slot.day === day && slot.hour === hour && slot.minute === minute
      )
    ).length;
  };

  const handleCalendarSync = useCallback((busySlots: TimeSlot[]) => {
    setSelectedSlots(prev => {
      const newSlots = prev.filter(slot => {
        return !busySlots.some(
          busy => busy.day === slot.day && busy.hour === slot.hour && busy.minute === slot.minute
        );
      });
      return newSlots;
    });
  }, []);

  const autoFillFreeTime = useCallback(() => {
    const allSlots: TimeSlot[] = [];
    
    dateRange.forEach((date, dayIndex) => {
      timeSlots.forEach(slot => {
        allSlots.push({
          day: dayIndex,
          hour: slot.hour,
          minute: slot.minute,
        });
      });
    });

    setSelectedSlots(allSlots);
    Alert.alert(
      'Đã điền tự động',
      `Đã chọn tất cả ${allSlots.length} khung giờ. Bạn có thể bỏ chọn các khung giờ bận.`
    );
  }, [dateRange, timeSlots]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#378699" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={28} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Chi tiết nhóm</Text>
        
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.groupIconContainer}>
          <Users size={40} color="white" />
        </View>
        <Text style={styles.groupName}>{currentGroup?.name || 'Chi tiết nhóm'}</Text>
        <Text style={styles.memberCount}>{currentGroup?.members.length || 0} thành viên</Text>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Calendar size={20} color="#378699" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Sự kiện</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={20} color="#378699" />
            <Text style={styles.statNumber}>{currentGroup?.desiredLocation ? '1' : '0'}</Text>
            <Text style={styles.statLabel}>Địa điểm</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={20} color="#378699" />
            <Text style={styles.statNumber}>{currentGroup?.members.length || 0}</Text>
            <Text style={styles.statLabel}>Thành viên</Text>
          </View>
        </View>

        {/* Tab Navigation - Flow Style */}
        <View style={styles.flowContainer}>
          <Text style={styles.flowTitle}>Quy trình tổ chức</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flowScrollContent}
          >
            <TouchableOpacity
              style={[styles.flowStep, activeTab === 'members' && styles.flowStepActive]}
              onPress={() => setActiveTab('members')}
            >
              <View style={[styles.flowStepNumber, activeTab === 'members' && styles.flowStepNumberActive]}>
                <Text style={[styles.flowStepNumberText, activeTab === 'members' && styles.flowStepNumberTextActive]}>1</Text>
              </View>
              <Users size={20} color={activeTab === 'members' ? '#378699' : '#95a5a6'} />
              <Text style={[styles.flowStepText, activeTab === 'members' && styles.flowStepTextActive]}>
                Thành viên
              </Text>
            </TouchableOpacity>
            
            <View style={styles.flowConnector} />
            
            <TouchableOpacity
              style={[styles.flowStep, activeTab === 'requirements' && styles.flowStepActive]}
              onPress={() => setActiveTab('requirements')}
            >
              <View style={[styles.flowStepNumber, activeTab === 'requirements' && styles.flowStepNumberActive]}>
                <Text style={[styles.flowStepNumberText, activeTab === 'requirements' && styles.flowStepNumberTextActive]}>2</Text>
              </View>
              <FileText size={20} color={activeTab === 'requirements' ? '#378699' : '#95a5a6'} />
              <Text style={[styles.flowStepText, activeTab === 'requirements' && styles.flowStepTextActive]}>
                Yêu cầu
              </Text>
            </TouchableOpacity>
            
            <View style={styles.flowConnector} />
            
            <TouchableOpacity
              style={[styles.flowStep, activeTab === 'schedule' && styles.flowStepActive]}
              onPress={() => setActiveTab('schedule')}
            >
              <View style={[styles.flowStepNumber, activeTab === 'schedule' && styles.flowStepNumberActive]}>
                <Text style={[styles.flowStepNumberText, activeTab === 'schedule' && styles.flowStepNumberTextActive]}>3</Text>
              </View>
              <Clock size={20} color={activeTab === 'schedule' ? '#378699' : '#95a5a6'} />
              <Text style={[styles.flowStepText, activeTab === 'schedule' && styles.flowStepTextActive]}>
                Lịch rảnh
              </Text>
            </TouchableOpacity>
            
            <View style={styles.flowConnector} />
            
            <TouchableOpacity
              style={[styles.flowStep, activeTab === 'gathering' && styles.flowStepActive]}
              onPress={() => setActiveTab('gathering')}
            >
              <View style={[styles.flowStepNumber, activeTab === 'gathering' && styles.flowStepNumberActive]}>
                <Text style={[styles.flowStepNumberText, activeTab === 'gathering' && styles.flowStepNumberTextActive]}>4</Text>
              </View>
              <MapPin size={20} color={activeTab === 'gathering' ? '#378699' : '#95a5a6'} />
              <Text style={[styles.flowStepText, activeTab === 'gathering' && styles.flowStepTextActive]}>
                Tập hợp
              </Text>
            </TouchableOpacity>
            
            <View style={styles.flowConnector} />
            
            <TouchableOpacity
              style={[styles.flowStep, activeTab === 'split' && styles.flowStepActive]}
              onPress={() => setActiveTab('split')}
            >
              <View style={[styles.flowStepNumber, activeTab === 'split' && styles.flowStepNumberActive]}>
                <Text style={[styles.flowStepNumberText, activeTab === 'split' && styles.flowStepNumberTextActive]}>5</Text>
              </View>
              <DollarSign size={20} color={activeTab === 'split' ? '#378699' : '#95a5a6'} />
              <Text style={[styles.flowStepText, activeTab === 'split' && styles.flowStepTextActive]}>
                Chia tiền
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Members Section */}
        {activeTab === 'members' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thành viên</Text>
            <View style={styles.membersList}>
              {currentGroup?.members.map((member, index) => (
                <View key={`member-${member.id}`} style={styles.memberCard}>
                  <View style={styles.memberCardHeader}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{member.name[0]}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>
                        {member.id === currentGroup.hostId ? 'Quản trị viên' : 'Thành viên'}
                      </Text>
                    </View>
                  </View>
                  {member.location && (
                    <View style={styles.memberDetailRow}>
                      <MapPin size={14} color="#7f8c8d" />
                      <Text style={styles.memberDetailText} numberOfLines={2}>
                        {member.location}
                      </Text>
                    </View>
                  )}
                  {member.budget && (
                    <View style={styles.memberDetailRow}>
                      <DollarSign size={14} color="#7f8c8d" />
                      <Text style={styles.memberDetailText}>
                        {formatCurrency(member.budget)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Requirements Section */}
        {activeTab === 'requirements' && (
          <View style={styles.section}>
            <View style={styles.requirementsContainer}>
              {/* Host's Requirements */}
              {isHost && (
                <>
                  <View style={styles.requirementItem}>
                    <View style={styles.requirementHeader}>
                      <FileText size={16} color="#378699" />
                      <Text style={styles.requirementTitle}>Ghi chú</Text>
                    </View>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="VD: họp, gặp mặt..."
                      placeholderTextColor="#bdc3c7"
                      value={hostNotes}
                      onChangeText={setHostNotes}
                    />
                  </View>
                  <View style={styles.requirementItem}>
                    <View style={styles.requirementHeader}>
                      <MapPin size={16} color="#378699" />
                      <Text style={styles.requirementTitle}>Địa điểm yêu cầu</Text>
                    </View>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="VD: quán cafe yên tĩnh..."
                      placeholderTextColor="#bdc3c7"
                      value={hostProposedLocation}
                      onChangeText={setHostProposedLocation}
                    />
                  </View>
                </>
              )}

              {!isHost && (hostNotes || hostProposedLocation) && (
                <>
                  {hostNotes && (
                    <View style={styles.requirementItem}>
                      <View style={styles.requirementHeader}>
                        <FileText size={16} color="#378699" />
                        <Text style={styles.requirementTitle}>Ghi chú (Host)</Text>
                      </View>
                      <Text style={styles.simpleValue}>{hostNotes}</Text>
                    </View>
                  )}
                  {hostProposedLocation && (
                    <View style={styles.requirementItem}>
                      <View style={styles.requirementHeader}>
                        <MapPin size={16} color="#378699" />
                        <Text style={styles.requirementTitle}>Địa điểm yêu cầu (Host)</Text>
                      </View>
                      <Text style={styles.simpleValue}>{hostProposedLocation}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Budget Input */}
              <View style={styles.requirementItem}>
                <View style={styles.requirementHeader}>
                  <DollarSign size={16} color="#378699" />
                  <Text style={styles.requirementTitle}>Ngân sách của bạn</Text>
                  <Text style={styles.privateLabel}>(riêng tư)</Text>
                </View>
                <TextInput
                  style={styles.simpleInput}
                  placeholder="VD: 150000"
                  placeholderTextColor="#bdc3c7"
                  value={userRequirement.budget}
                  onChangeText={(text) => setUserRequirement({...userRequirement, budget: text.replace(/[^0-9]/g, '')})}
                  keyboardType="numeric"
                />
                {userRequirement.budget && parseFloat(userRequirement.budget) > 0 && (
                  <Text style={styles.budgetPreview}>
                    {formatCurrency(parseFloat(userRequirement.budget))}
                  </Text>
                )}
              </View>

              {/* Budget Display Toggle */}
              <View style={styles.requirementItem}>
                <View style={styles.requirementHeader}>
                  <Text style={styles.requirementTitle}>Ngân sách nhóm</Text>
                </View>
                <View style={styles.budgetToggle}>
                  <TouchableOpacity
                    style={[
                      styles.budgetOption,
                      budgetDisplay === 'average' && styles.budgetOptionActive
                    ]}
                    onPress={() => setBudgetDisplay('average')}
                  >
                    <Text style={[
                      styles.budgetOptionText,
                      budgetDisplay === 'average' && styles.budgetOptionTextActive
                    ]}>Trung bình</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.budgetOption,
                      budgetDisplay === 'minimum' && styles.budgetOptionActive
                    ]}
                    onPress={() => setBudgetDisplay('minimum')}
                  >
                    <Text style={[
                      styles.budgetOptionText,
                      budgetDisplay === 'minimum' && styles.budgetOptionTextActive
                    ]}>Thấp nhất</Text>
                  </TouchableOpacity>
                </View>
                {displayBudget && (
                  <Text style={styles.groupBudgetValue}>{formatCurrency(displayBudget)}</Text>
                )}
              </View>

              {/* Member's Requirements */}
              {!isHost && (
                <>
                  <View style={styles.requirementItem}>
                    <View style={styles.requirementHeader}>
                      <FileText size={16} color="#378699" />
                      <Text style={styles.requirementTitle}>Ghi chú của bạn</Text>
                    </View>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="VD: Cần chỗ đậu xe..."
                      placeholderTextColor="#bdc3c7"
                      value={memberNotes}
                      onChangeText={setMemberNotes}
                    />
                  </View>
                  <View style={styles.requirementItem}>
                    <View style={styles.requirementHeader}>
                      <MapPin size={16} color="#378699" />
                      <Text style={styles.requirementTitle}>Địa điểm yêu cầu của bạn</Text>
                    </View>
                    <TextInput
                      style={styles.simpleInput}
                      placeholder="VD: quán cafe gần nhà..."
                      placeholderTextColor="#bdc3c7"
                      value={memberPreferredLocation}
                      onChangeText={setMemberPreferredLocation}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity 
                style={styles.saveRequirementsButton}
                onPress={async () => {
                  try {
                    if (!currentGroup) {
                      Alert.alert('Lỗi', 'Không tìm thấy nhóm');
                      return;
                    }

                    if (isHost) {
                      await updateHostRequirements(currentGroup.id, hostNotes, hostProposedLocation);
                    } else {
                      await updateMemberRequirements(currentGroup.id, user?.id || '1', memberNotes, memberPreferredLocation);
                    }

                    if (userRequirement.budget) {
                      const budgetNum = parseFloat(userRequirement.budget);
                      if (!isNaN(budgetNum) && budgetNum > 0) {
                        await updateMemberBudget(currentGroup.id, user?.id || '1', budgetNum);
                      }
                    }

                    Alert.alert('Thành công', 'Đã lưu yêu cầu của bạn!');
                  } catch (error) {
                    console.error('Error saving requirements:', error);
                    Alert.alert('Lỗi', 'Không thể lưu yêu cầu. Vui lòng thử lại.');
                  }
                }}
              >
                <Text style={styles.saveRequirementsButtonText}>Lưu yêu cầu</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Activities - Only show in members tab */}
        {activeTab === 'members' && currentGroup && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
          <View style={styles.activitiesList}>
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{currentGroup.hostName} đã tạo nhóm</Text>
                <Text style={styles.activityTime}>{new Date(currentGroup.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
            </View>
            {currentGroup.members.slice(1).map((member, index) => (
              <View key={`activity-${member.id}`} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{member.name} đã tham gia nhóm</Text>
                  <Text style={styles.activityTime}>Gần đây</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Split Bill Section */}
        {activeTab === 'split' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <DollarSign size={20} color="#378699" />
              <Text style={styles.sectionTitle}>Chia tiền</Text>
            </View>
            
            <View style={styles.splitContainer}>
              {/* Payment Mode Selection */}
              <View style={styles.paymentModeSection}>
                <Text style={styles.paymentModeTitle}>Chế độ thanh toán</Text>
                <View style={styles.paymentModeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      paymentMode === 'split' && styles.paymentModeCardActive
                    ]}
                    onPress={() => setPaymentMode('split')}
                  >
                    <View style={[
                      styles.paymentModeIcon,
                      paymentMode === 'split' && styles.paymentModeIconActive
                    ]}>
                      <DollarSign size={24} color={paymentMode === 'split' ? 'white' : '#378699'} />
                    </View>
                    <Text style={[
                      styles.paymentModeText,
                      paymentMode === 'split' && styles.paymentModeTextActive
                    ]}>Chia đều nha!</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      paymentMode === 'treat-all' && styles.paymentModeCardActive
                    ]}
                    onPress={() => setPaymentMode('treat-all')}
                  >
                    <View style={[
                      styles.paymentModeIcon,
                      paymentMode === 'treat-all' && styles.paymentModeIconActive
                    ]}>
                      <DollarSign size={24} color={paymentMode === 'treat-all' ? 'white' : '#378699'} />
                    </View>
                    <Text style={[
                      styles.paymentModeText,
                      paymentMode === 'treat-all' && styles.paymentModeTextActive
                    ]}>Để tui bao!</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      paymentMode === 'treat-partial' && styles.paymentModeCardActive
                    ]}
                    onPress={() => setPaymentMode('treat-partial')}
                  >
                    <View style={[
                      styles.paymentModeIcon,
                      paymentMode === 'treat-partial' && styles.paymentModeIconActive
                    ]}>
                      <DollarSign size={24} color={paymentMode === 'treat-partial' ? 'white' : '#378699'} />
                    </View>
                    <Text style={[
                      styles.paymentModeText,
                      paymentMode === 'treat-partial' && styles.paymentModeTextActive
                    ]}>Tui trả 1 phần</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.comingSoonCard}>
                <DollarSign size={48} color="#378699" />
                <Text style={styles.comingSoonTitle}>Tính năng đang phát triển</Text>
                <Text style={styles.comingSoonDescription}>
                  Tính năng chia tiền thông minh với AI nhận diện hóa đơn, tự động tính thuế, và hỗ trợ QR thanh toán sẽ sớm ra mắt!
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <View style={styles.featureBullet} />
                    <Text style={styles.featureText}>AI nhận diện hóa đơn tiếng Việt</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureBullet} />
                    <Text style={styles.featureText}>Gán món cho người dễ dàng</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureBullet} />
                    <Text style={styles.featureText}>Tích hợp QR Momo, ZaloPay</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.featureBullet} />
                    <Text style={styles.featureText}>Hỗ trợ treat và split fair</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Gathering Section */}
        {activeTab === 'gathering' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#378699" />
              <Text style={styles.sectionTitle}>Quản lí nhóm: Tìm địa điểm phù hợp</Text>
            </View>
            
            <View style={styles.gatheringContainer}>
              {/* Display group requirements */}
              {(currentGroup?.hostNotes || currentGroup?.hostPreferredLocation) && (
                <View style={styles.gatheringRequirements}>
                  <Text style={styles.gatheringRequirementsTitle}>Yêu cầu của nhóm</Text>
                  
                  {currentGroup.hostNotes && (
                    <View style={styles.gatheringRequirementItem}>
                      <FileText size={16} color="#378699" />
                      <View style={styles.gatheringRequirementContent}>
                        <Text style={styles.gatheringRequirementLabel}>Ghi chú:</Text>
                        <Text style={styles.gatheringRequirementValue}>{currentGroup.hostNotes}</Text>
                      </View>
                    </View>
                  )}
                  
                  {currentGroup.hostPreferredLocation && (
                    <View style={styles.gatheringRequirementItem}>
                      <MapPin size={16} color="#378699" />
                      <View style={styles.gatheringRequirementContent}>
                        <Text style={styles.gatheringRequirementLabel}>Địa điểm yêu cầu:</Text>
                        <Text style={styles.gatheringRequirementValue}>{currentGroup.hostPreferredLocation}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
              
              {/* Display member locations and budgets */}
              {currentGroup && currentGroup.members.length > 0 && (
                <View style={styles.gatheringMembersInfo}>
                  <Text style={styles.gatheringMembersTitle}>Thông tin thành viên</Text>
                  {currentGroup.members.map((member) => (
                    <View key={member.id} style={styles.gatheringMemberCard}>
                      <View style={styles.gatheringMemberHeader}>
                        <View style={styles.gatheringMemberAvatar}>
                          <Text style={styles.gatheringMemberAvatarText}>{member.name[0]}</Text>
                        </View>
                        <Text style={styles.gatheringMemberName}>{member.name}</Text>
                      </View>
                      {member.location && (
                        <View style={styles.gatheringMemberDetail}>
                          <MapPin size={14} color="#7f8c8d" />
                          <Text style={styles.gatheringMemberDetailText}>{member.location}</Text>
                        </View>
                      )}
                      {member.budget && (
                        <View style={styles.gatheringMemberDetail}>
                          <DollarSign size={14} color="#7f8c8d" />
                          <Text style={styles.gatheringMemberDetailText}>{formatCurrency(member.budget)}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.findLocationButton}
                onPress={() => router.push('/find-location')}
              >
                <MapPin size={20} color="white" />
                <Text style={styles.findLocationButtonText}>Tìm địa điểm phù hợp</Text>
              </TouchableOpacity>
              
              <View style={styles.gatheringInfo}>
                <Text style={styles.gatheringInfoTitle}>Hướng dẫn</Text>
                <Text style={styles.gatheringInfoText}>
                  Sử dụng tính năng này để tìm địa điểm phù hợp với tất cả thành viên dựa trên vị trí và ngân sách của họ.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* When2Meet Section */}
        {activeTab === 'schedule' && (
        <View style={[styles.section, { marginTop: 20 }]}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#378699" />
            <Text style={styles.sectionTitle}>Lịch rảnh - When2Meet</Text>
          </View>
          
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{eventDetails.name}</Text>
            <Text style={styles.eventDuration}>Thời lượng: {eventDetails.duration} giờ</Text>
            <Text style={styles.eventTimeRange}>
              Khung giờ: {eventDetails.startTime.hour}:00 - {eventDetails.endTime.hour}:00
            </Text>
          </View>

          {/* Calendar Sync */}
          <CalendarSync
            dateRange={dateRange}
            startTime={eventDetails.startTime}
            endTime={eventDetails.endTime}
            onSyncComplete={handleCalendarSync}
          />

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, isEditMode && styles.quickActionButtonActive]}
              onPress={toggleEditMode}
            >
              <Edit3 size={16} color={isEditMode ? 'white' : '#378699'} />
              <Text style={[styles.quickActionText, isEditMode && styles.quickActionTextActive]}>
                {isEditMode ? 'Xong' : 'Chỉnh sửa'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={autoFillFreeTime}
            >
              <Clock size={16} color="#378699" />
              <Text style={styles.quickActionText}>Điền tất cả</Text>
            </TouchableOpacity>
          </View>

          {/* Time grid */}
          <View style={styles.when2meetContainer}>
            <Text style={styles.gridInstruction}>
              {isEditMode 
                ? 'Chế độ chỉnh sửa: Chạm để chọn/bỏ chọn'
                : 'Nhấn &ldquo;Chỉnh sửa&rdquo; để thay đổi lịch rảnh của bạn'}
            </Text>
            
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.gridScrollView}
              contentContainerStyle={styles.gridScrollContent}
              nestedScrollEnabled={true}
            >
              <View style={styles.gridWrapper}>
                {/* Time labels column */}
                <View style={styles.timeLabelsColumn}>
                  <View style={styles.emptyCorner} />
                  {timeSlots.map((slot, index) => (
                    <View key={`time-${index}`} style={styles.timeLabelCell}>
                      <Text style={styles.timeLabelText}>
                        {slot.hour.toString().padStart(2, '0')}:{slot.minute.toString().padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.daysGrid}>
                  {dateRange.map((date, dayIndex) => (
                    <View key={`day-${dayIndex}`} style={styles.dayColumn}>
                      {/* Day header */}
                      <View style={styles.dayHeaderCell}>
                        <Text style={styles.dayHeaderDay}>
                          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}
                        </Text>
                        <Text style={styles.dayHeaderDateText}>
                          {date.getDate()}/{date.getMonth() + 1}
                        </Text>
                      </View>

                      {/* Time slots */}
                      {timeSlots.map((slot, slotIndex) => {
                        const isSelected = isSlotSelected(dayIndex, slot.hour, slot.minute);
                        const availCount = getMemberAvailabilityCount(dayIndex, slot.hour, slot.minute);

                        return (
                          <TouchableOpacity
                            key={`slot-${slotIndex}`}
                            style={[
                              styles.timeSlot,
                              isSelected && styles.timeSlotSelected,
                              availCount > 0 && !isSelected && styles.timeSlotWithAvailability,
                              !isEditMode && styles.timeSlotDisabled
                            ]}
                            onPress={() => {
                              if (!isEditMode) return;
                              console.log('Slot pressed:', dayIndex, slot.hour, slot.minute);
                              toggleSlot(dayIndex, slot.hour, slot.minute);
                            }}
                            onLongPress={() => {
                              if (!isEditMode) return;
                              console.log('Slot long pressed');
                              toggleSlot(dayIndex, slot.hour, slot.minute);
                            }}
                            activeOpacity={isEditMode ? 0.7 : 1}
                            disabled={!isEditMode}
                          >
                            {availCount > 0 && (
                              <Text style={[
                                styles.availabilityCount,
                                isSelected && styles.availabilityCountSelected
                              ]}>
                                {availCount}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#378699' }]} />
                <Text style={styles.legendText}>Bạn rảnh</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'rgba(55, 134, 153, 0.15)' }]} />
                <Text style={styles.legendText}>Người khác rảnh</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.selectionSummary}>
              <Text style={styles.summaryText}>
                Đã chọn: {selectedSlots.length} khung giờ
              </Text>
              {selectedSlots.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSelectedSlots([])}
                >
                  <Text style={styles.clearButtonText}>Xóa hết</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Xác nhận thời gian</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Mời thêm thành viên</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#378699',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        paddingTop: 0,
      },
      android: {
        paddingTop: StatusBar.currentHeight || 0,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  heroSection: {
    backgroundColor: '#378699',
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  groupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  memberCount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  memberDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 4,
  },
  memberDetailText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 20,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f4f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#378699',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#378699',
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: '#2c3e50',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 13,
    color: '#95a5a6',
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#378699',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#378699',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#378699',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378699',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  eventInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  eventDuration: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  eventTimeRange: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  when2meetContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 400,
  },
  gridInstruction: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  gridScrollView: {
    maxHeight: 450,
    minHeight: 350,
  },
  gridScrollContent: {
    paddingRight: 16,
  },
  gridWrapper: {
    flexDirection: 'row',
  },
  timeLabelsColumn: {
    width: 55,
    marginRight: 8,
  },
  emptyCorner: {
    height: 45,
    marginBottom: 4,
  },
  timeLabelCell: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timeLabelText: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
  },
  dayColumn: {
    width: 85,
    marginRight: 6,
  },
  dayHeaderCell: {
    height: 45,
    backgroundColor: '#378699',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayHeaderDay: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  dayHeaderDateText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  timeSlot: {
    height: 38,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minWidth: 83,
  },
  timeSlotSelected: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  timeSlotWithAvailability: {
    backgroundColor: 'rgba(55, 134, 153, 0.15)',
    borderColor: 'rgba(55, 134, 153, 0.3)',
  },
  availabilityCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#378699',
  },
  availabilityCountSelected: {
    color: 'white',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  selectionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  summaryText: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#378699',
  },
  quickActionButtonActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#378699',
  },
  quickActionTextActive: {
    color: 'white',
  },
  timeSlotDisabled: {
    opacity: 0.7,
  },
  flowContainer: {
    marginBottom: 24,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2c3e50',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  flowScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  flowStep: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 110,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  flowStepActive: {
    backgroundColor: '#e8f4f7',
    borderColor: '#378699',
    shadowColor: '#378699',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  flowStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  flowStepNumberActive: {
    backgroundColor: '#378699',
  },
  flowStepNumberText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#95a5a6',
  },
  flowStepNumberTextActive: {
    color: 'white',
  },
  flowStepText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#95a5a6',
    marginTop: 6,
    textAlign: 'center',
  },
  flowStepTextActive: {
    color: '#378699',
    fontWeight: '700' as const,
  },
  flowConnector: {
    width: 24,
    height: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginHorizontal: 4,
  },
  requirementsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  requirementItem: {
    marginBottom: 20,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2c3e50',
  },
  privateLabel: {
    fontSize: 11,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  simpleInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  simpleInputMultiline: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  simpleValue: {
    fontSize: 14,
    color: '#2c3e50',
    paddingVertical: 4,
  },
  budgetPreview: {
    fontSize: 16,
    color: '#378699',
    marginTop: 6,
    fontWeight: '600' as const,
  },
  budgetToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  budgetOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  budgetOptionActive: {
    backgroundColor: '#378699',
  },
  budgetOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#7f8c8d',
  },
  budgetOptionTextActive: {
    color: 'white',
    fontWeight: '600' as const,
  },
  groupBudgetValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#378699',
    marginTop: 12,
    textAlign: 'center',
  },
  saveRequirementsButton: {
    backgroundColor: '#378699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveRequirementsButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'white',
  },
  gatheringContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  findLocationButton: {
    backgroundColor: '#378699',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#378699',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  findLocationButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  gatheringInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  gatheringInfoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2c3e50',
    marginBottom: 8,
  },
  gatheringInfoText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  gatheringRequirements: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gatheringRequirementsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2c3e50',
    marginBottom: 12,
  },
  gatheringRequirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  gatheringRequirementContent: {
    flex: 1,
  },
  gatheringRequirementLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  gatheringRequirementValue: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  gatheringMembersInfo: {
    marginBottom: 16,
  },
  gatheringMembersTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2c3e50',
    marginBottom: 12,
  },
  gatheringMemberCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  gatheringMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gatheringMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f4f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gatheringMemberAvatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#378699',
  },
  gatheringMemberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#2c3e50',
  },
  gatheringMemberDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingLeft: 42,
  },
  gatheringMemberDetailText: {
    fontSize: 13,
    color: '#2c3e50',
    flex: 1,
  },
  splitContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  comingSoonCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#378699',
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  paymentModeSection: {
    marginBottom: 24,
  },
  paymentModeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2c3e50',
    marginBottom: 16,
  },
  paymentModeOptions: {
    gap: 12,
  },
  paymentModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  paymentModeCardActive: {
    backgroundColor: '#e8f4f7',
    borderColor: '#378699',
  },
  paymentModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f4f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentModeIconActive: {
    backgroundColor: '#378699',
  },
  paymentModeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2c3e50',
    flex: 1,
  },
  paymentModeTextActive: {
    color: '#378699',
  },
});