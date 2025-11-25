import { router } from 'expo-router';
import { MapPin, Users, Calendar, Clock, X, ChevronDown } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroups } from '@/contexts/GroupContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function CreateGroupScreen() {
  const { createGroup } = useGroups();
  const [groupName, setGroupName] = useState('');
  const [hostName, setHostName] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [enableTimeRange, setEnableTimeRange] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdGroupCode, setCreatedGroupCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Initialize with tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(21, 0, 0, 0);

  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(nextWeek);
  const [startTime, setStartTime] = useState(new Date(tomorrow));
  const [endTime, setEndTime] = useState(new Date(nextWeek));

  // Common districts and cities in Vietnam
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

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const hostLocation = useMemo(() => {
    const parts = [];
    if (streetNumber.trim()) parts.push(streetNumber.trim());
    if (district) parts.push(district);
    if (city) parts.push(city);
    return parts.join(', ');
  }, [streetNumber, district, city]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (!hostName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn');
      return;
    }
    if (!streetNumber.trim() || !district || !city) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ địa chỉ (số nhà, quận/huyện, thành phố)');
      return;
    }
    if (!maxMembers || parseInt(maxMembers) < 2) {
      Alert.alert('Lỗi', 'Số thành viên tối thiểu là 2');
      return;
    }

    if (enableTimeRange) {
      // Validate dates
      const now = new Date();
      if (startDate < now) {
        Alert.alert('Lỗi', 'Ngày bắt đầu không thể là quá khứ');
        return;
      }
      if (endDate < startDate) {
        Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
        return;
      }
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        Alert.alert('Lỗi', 'Khoảng thời gian không được quá 30 ngày');
        return;
      }
      // Validate times
      if (startTime.getHours() === endTime.getHours() && startTime.getMinutes() === endTime.getMinutes()) {
        Alert.alert('Lỗi', 'Giờ bắt đầu và kết thúc không được giống nhau');
        return;
      }
    }

    setIsCreating(true);
    try {
      const newGroup = await createGroup({
        name: groupName,
        hostName: hostName,
        hostLocation: hostLocation,
        maxMembers: parseInt(maxMembers),
        timeRange: enableTimeRange ? {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
        } : undefined,
      });

      setCreatedGroupCode(newGroup.code);
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/friends');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Tạo nhóm mới</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Users size={18} color="#378699" />
                <Text style={styles.label}>Tên nhóm</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Nhóm bạn thân"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Users size={18} color="#378699" />
                <Text style={styles.label}>Tên của bạn (Host)</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên của bạn"
                value={hostName}
                onChangeText={setHostName}
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
                value={streetNumber}
                onChangeText={setStreetNumber}
                placeholderTextColor="#999"
              />
              
              <View style={styles.addressRow}>
                <TouchableOpacity
                  style={[styles.addressInput, styles.addressInputDistrict]}
                  onPress={() => setShowDistrictPicker(true)}
                >
                  <Text style={[styles.addressText, !district && styles.placeholderText]}>
                    {district || 'Quận/Huyện'}
                  </Text>
                  <ChevronDown size={18} color="#666" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.addressInput, styles.addressInputCity]}
                  onPress={() => setShowCityPicker(true)}
                >
                  <Text style={[styles.addressText, !city && styles.placeholderText]}>
                    {city || 'Thành phố'}
                  </Text>
                  <ChevronDown size={18} color="#666" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.hint}>
                Địa chỉ này sẽ được dùng để tìm địa điểm phù hợp cho cả nhóm
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Users size={18} color="#378699" />
                <Text style={styles.label}>Số thành viên tối đa</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 10"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.toggleOption}
              onPress={() => setEnableTimeRange(!enableTimeRange)}
            >
              <View style={styles.toggleLeft}>
                <Calendar size={18} color="#378699" />
                <Text style={styles.toggleLabel}>
                  Thiết lập khung thời gian chọn lịch rảnh
                </Text>
              </View>
              <View style={[styles.checkbox, enableTimeRange && styles.checkboxChecked]}>
                {enableTimeRange && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>

            {enableTimeRange && (
              <View style={styles.timeRangeSection}>
                <Text style={styles.sectionTitle}>Khung thời gian hẹn</Text>
                
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker('start')}
                  >
                    <Text style={styles.dateLabel}>Từ ngày</Text>
                    <View style={styles.dateButton}>
                      <Calendar size={16} color="#378699" />
                      <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker('end')}
                  >
                    <Text style={styles.dateLabel}>Đến ngày</Text>
                    <View style={styles.dateButton}>
                      <Calendar size={16} color="#378699" />
                      <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeInputContainer}
                    onPress={() => setShowTimePicker('start')}
                  >
                    <Text style={styles.timeLabel}>Giờ bắt đầu</Text>
                    <View style={styles.timeButton}>
                      <Clock size={16} color="#378699" />
                      <Text style={styles.timeButtonText}>{formatTime(startTime)}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.timeInputContainer}
                    onPress={() => setShowTimePicker('end')}
                  >
                    <Text style={styles.timeLabel}>Giờ kết thúc</Text>
                    <View style={styles.timeButton}>
                      <Clock size={16} color="#378699" />
                      <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.timeHint}>
                  * Thời gian hẹn trong vòng 30 ngày tới
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreateGroup}
            disabled={isCreating}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
            </Text>
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Tạo nhóm thành công!</Text>
            <Text style={styles.modalText}>
              Mã nhóm của bạn là:
            </Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{createdGroupCode}</Text>
            </View>
            <Text style={styles.modalHint}>
              Chia sẻ mã này với bạn bè để họ tham gia nhóm
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

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text style={styles.pickerCancel}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {showDatePicker === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text style={styles.pickerDone}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showDatePicker === 'start' ? startDate : endDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                maximumDate={(() => {
                  const maxDate = new Date();
                  maxDate.setDate(maxDate.getDate() + 30);
                  return maxDate;
                })()}
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (selectedDate) {
                    if (showDatePicker === 'start') {
                      setStartDate(selectedDate);
                    } else {
                      setEndDate(selectedDate);
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          maximumDate={(() => {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 30);
            return maxDate;
          })()}
          onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
            setShowDatePicker(null);
            if (selectedDate) {
              if (showDatePicker === 'start') {
                setStartDate(selectedDate);
              } else {
                setEndDate(selectedDate);
              }
            }
          }}
        />
      )}

      {/* Time Picker Modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={styles.pickerCancel}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>
                  {showTimePicker === 'start' ? 'Giờ bắt đầu' : 'Giờ kết thúc'}
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={styles.pickerDone}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showTimePicker === 'start' ? startTime : endTime}
                mode="time"
                display="spinner"
                minuteInterval={30}
                onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                  if (selectedTime) {
                    if (showTimePicker === 'start') {
                      setStartTime(selectedTime);
                    } else {
                      setEndTime(selectedTime);
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={showTimePicker === 'start' ? startTime : endTime}
          mode="time"
          display="default"
          minuteInterval={30}
          onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
            setShowTimePicker(null);
            if (selectedTime) {
              if (showTimePicker === 'start') {
                setStartTime(selectedTime);
              } else {
                setEndTime(selectedTime);
              }
            }
          }}
        />
      )}

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
                    setDistrict(item);
                    setShowDistrictPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, district === item && styles.pickerItemSelected]}>
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
                    setCity(item);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, city === item && styles.pickerItemSelected]}>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    marginTop: 20,
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#378699',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#378699',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeRangeSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
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
  pickerDone: {
    fontSize: 16,
    color: '#378699',
    fontWeight: '600',
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
  addressInputDistrict: {
    flex: 1.3,
  },
  addressInputCity: {
    flex: 1,
  },
  createButton: {
    backgroundColor: '#378699',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  codeContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#378699',
    letterSpacing: 2,
  },
  modalHint: {
    fontSize: 14,
    color: '#999',
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
});