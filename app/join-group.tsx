import { router } from 'expo-router';
import { ArrowLeft, Users, MapPin, User, ChevronDown } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroups } from '@/contexts/GroupContext';

export default function JoinGroupScreen() {
  const { joinGroup, getGroupByCode } = useGroups();
  const [step, setStep] = useState<'code' | 'info'>('code');
  const [groupCode, setGroupCode] = useState('');
  const [memberInfo, setMemberInfo] = useState({
    name: '',
    streetNumber: '',
    district: '',
    city: '',
  });
  const [foundGroup, setFoundGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const districts = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp',
    'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú',
    'Quận Bình Tân', 'Quận Thủ Đức', 'Huyện Bình Chánh',
    'Huyện Cần Giờ', 'Huyện Củ Chi', 'Huyện Hóc Môn',
    'Huyện Nhà Bè'
  ];

  const cities = [
    'TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng',
    'Biên Hòa', 'Nha Trang', 'Huế', 'Vũng Tàu', 'Quy Nhon',
    'Long Xuyên', 'Buôn Ma Thuột', 'Đà Lạt', 'Phan Thiết'
  ];

  const memberLocation = useMemo(() => {
    const parts = [];
    if (memberInfo.streetNumber.trim()) parts.push(memberInfo.streetNumber.trim());
    if (memberInfo.district) parts.push(memberInfo.district);
    if (memberInfo.city) parts.push(memberInfo.city);
    return parts.join(', ');
  }, [memberInfo.streetNumber, memberInfo.district, memberInfo.city]);

  const handleCheckCode = () => {
    if (!groupCode || groupCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã nhóm 6 số');
      return;
    }

    const group = getGroupByCode(groupCode);
    if (!group) {
      Alert.alert('Lỗi', 'Mã nhóm không tồn tại');
      return;
    }

    setFoundGroup(group);
    setStep('info');
  };

  const handleJoinGroup = async () => {
    if (!memberInfo.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn');
      return;
    }
    if (!memberInfo.streetNumber.trim() || !memberInfo.district || !memberInfo.city) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ địa chỉ (số nhà, quận/huyện, thành phố)');
      return;
    }

    try {
      setIsLoading(true);
      const group = getGroupByCode(groupCode);
      if (!group) {
        Alert.alert('Lỗi', 'Mã nhóm không tồn tại');
        return;
      }
      
      await joinGroup(groupCode, {
        name: memberInfo.name,
        email: '',
        location: memberLocation,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tham gia nhóm');
    } finally {
      setIsLoading(false);
    }
  };

  const formatGroupCode = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setGroupCode(cleaned);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/friends');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step === 'info' ? setStep('code') : router.back()}
        >
          <ArrowLeft size={24} color="#378699" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tham gia nhóm</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 'code' ? (
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Users size={48} color="#378699" />
                </View>
              </View>

              <Text style={styles.title}>Nhập mã nhóm</Text>
              <Text style={styles.subtitle}>
                Nhập mã 6 số mà bạn bè đã chia sẻ để tham gia nhóm
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.codeInput}
                  value={groupCode}
                  onChangeText={formatGroupCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.joinButton,
                  (!groupCode || groupCode.length !== 6) && styles.disabledButton
                ]}
                onPress={handleCheckCode}
                disabled={!groupCode || groupCode.length !== 6}
              >
                <Text style={styles.joinButtonText}>Tiếp tục</Text>
              </TouchableOpacity>

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>Không có mã nhóm?</Text>
                <Text style={styles.helpText}>
                  Yêu cầu bạn bè tạo nhóm mới và chia sẻ mã 6 số với bạn
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoContent}>
              {foundGroup && (
                <View style={styles.groupInfo}>
                  <View style={styles.groupInfoCard}>
                    <Users size={24} color="#378699" />
                    <Text style={styles.groupName}>{foundGroup.name}</Text>
                    <Text style={styles.groupDetails}>
                      Host: {foundGroup.hostName}
                    </Text>
                    <Text style={styles.groupDetails}>
                      {foundGroup.members.length}/{foundGroup.maxMembers} thành viên
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.formTitle}>Thông tin của bạn</Text>
              
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <User size={18} color="#378699" />
                    <Text style={styles.label}>Tên của bạn</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập tên của bạn"
                    value={memberInfo.name}
                    onChangeText={(text) => setMemberInfo({...memberInfo, name: text})}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabel}>
                    <MapPin size={18} color="#378699" />
                    <Text style={styles.label}>Địa chỉ gần đúng của bạn</Text>
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Số nhà, tên đường (VD: 123 Nguyễn Huệ)"
                    value={memberInfo.streetNumber}
                    onChangeText={(text) => setMemberInfo({...memberInfo, streetNumber: text})}
                    placeholderTextColor="#999"
                  />
                  
                  <View style={styles.addressRow}>
                    <TouchableOpacity
                      style={[styles.addressInput, styles.addressInputDistrict]}
                      onPress={() => setShowDistrictPicker(true)}
                    >
                      <Text style={[styles.addressText, !memberInfo.district && styles.placeholderText]}>
                        {memberInfo.district || 'Quận/Huyện'}
                      </Text>
                      <ChevronDown size={18} color="#666" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.addressInput, styles.addressInputCity]}
                      onPress={() => setShowCityPicker(true)}
                    >
                      <Text style={[styles.addressText, !memberInfo.city && styles.placeholderText]}>
                        {memberInfo.city || 'Thành phố'}
                      </Text>
                      <ChevronDown size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.hint}>
                    Địa chỉ này sẽ được dùng để tìm địa điểm phù hợp cho cả nhóm
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.joinButton,
                  isLoading && styles.disabledButton
                ]}
                onPress={handleJoinGroup}
                disabled={isLoading}
              >
                <Text style={styles.joinButtonText}>
                  {isLoading ? 'Đang tham gia...' : 'Tham gia nhóm'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Users size={48} color="#378699" />
            </View>
            <Text style={styles.modalTitle}>Tham gia thành công!</Text>
            <Text style={styles.modalText}>
              Bạn đã tham gia nhóm "{foundGroup?.name}" thành công
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.modalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* District Picker Modal */}
      <Modal
        visible={showDistrictPicker}
        transparent
        animationType="slide"
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                <Text style={styles.pickerCancel}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Chọn quận/huyện</Text>
              <View style={styles.spacer} />
            </View>
            <ScrollView style={styles.pickerList}>
              {districts.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.pickerItem}
                  onPress={() => {
                    setMemberInfo({...memberInfo, district: item});
                    setShowDistrictPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, memberInfo.district === item && styles.pickerItemSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Text style={styles.pickerCancel}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Chọn thành phố</Text>
              <View style={styles.spacer} />
            </View>
            <ScrollView style={styles.pickerList}>
              {cities.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.pickerItem}
                  onPress={() => {
                    setMemberInfo({...memberInfo, city: item});
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, memberInfo.city === item && styles.pickerItemSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 100,
    height: 100,
    backgroundColor: '#e8f4f8',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  codeInput: {
    height: 80,
    borderWidth: 2,
    borderColor: '#378699',
    borderRadius: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#378699',
    letterSpacing: 8,
  },
  joinButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#378699',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  infoContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  groupInfo: {
    marginBottom: 32,
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
    marginBottom: 8,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '85%',
  },
  modalIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#e8f4f8',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#378699',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    minHeight: 44,
  },
  addressInputDistrict: {
    flex: 1.3,
  },
  addressInputCity: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  placeholderText: {
    color: '#999',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#378699',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  pickerItemSelected: {
    color: '#378699',
    fontWeight: '600',
  },
  spacer: {
    width: 40,
  },
});