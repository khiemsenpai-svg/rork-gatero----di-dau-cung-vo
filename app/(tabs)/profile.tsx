import { User, LogOut, Bell, Shield, HelpCircle, Camera, Edit2, QrCode } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/contexts/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
  showArrow?: boolean;
}

export default function ProfileScreen() {
  const { user, logout, updateUserProfile } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState(user?.displayName || user?.name || '');
  const [editedAge, setEditedAge] = useState(user?.age?.toString() || '');
  const [editedGender, setEditedGender] = useState<'male' | 'female'>(user?.gender || 'male');
  const [editedAvatar, setEditedAvatar] = useState(user?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const [editedQr, setEditedQr] = useState(user?.qrBankImage || '');

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setEditedAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn');
      return;
    }

    const age = parseInt(editedAge);
    if (!editedAge || isNaN(age) || age < 1 || age > 120) {
      Alert.alert('Lỗi', 'Vui lòng nhập tuổi hợp lệ (1-120)');
      return;
    }

    try {
      setIsLoading(true);
      await updateUserProfile({
        displayName: editedName,
        age,
        gender: editedGender,
        avatar: editedAvatar,
        qrBankImage: editedQr,
      });
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = () => {
    setEditedName(user?.displayName || user?.name || '');
    setEditedAge(user?.age?.toString() || '');
    setEditedGender(user?.gender || 'male');
    setEditedAvatar(user?.avatar || '');
    setEditedQr(user?.qrBankImage || '');
    setIsEditModalVisible(true);
  };

  const settingsItems: SettingItem[] = [
    {
      id: 'notifications',
      title: 'Thông báo',
      subtitle: 'Quản lý thông báo và âm thanh',
      icon: Bell,
      onPress: () => {},
      showArrow: true,
    },
    {
      id: 'privacy',
      title: 'Quyền riêng tư',
      subtitle: 'Cài đặt bảo mật và quyền riêng tư',
      icon: Shield,
      onPress: () => {},
      showArrow: true,
    },
    {
      id: 'help',
      title: 'Trợ giúp',
      subtitle: 'Câu hỏi thường gặp và hỗ trợ',
      icon: HelpCircle,
      onPress: () => {},
      showArrow: true,
    },
    {
      id: 'logout',
      title: 'Đăng xuất',
      icon: LogOut,
      onPress: handleLogout,
      showArrow: false,
    },
  ];

  return (
    <TabScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <User size={40} color="white" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.displayName || user?.name}</Text>
          {user?.age && user?.gender && (
            <Text style={styles.userInfo}>
              {user.age} tuổi • {user.gender === 'male' ? 'Nam' : 'Nữ'}
            </Text>
          )}
          
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
            <Edit2 size={16} color="#378699" />
            <Text style={styles.editProfileButtonText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>QR thanh toán</Text>
          <View style={styles.qrCard}>
            {user?.qrBankImage ? (
              <Image source={{ uri: user.qrBankImage }} style={styles.qrImage} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <QrCode size={36} color="#378699" />
                <Text style={styles.qrPlaceholderText}>Chưa cập nhật QR ngân hàng</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editProfileButton} onPress={openEditModal}>
              <Edit2 size={16} color="#378699" />
              <Text style={styles.editProfileButtonText}>Cập nhật QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          <View style={styles.settingsList}>
            {settingsItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.settingItem,
                  item.id === 'logout' && styles.logoutItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[
                    styles.settingIcon,
                    item.id === 'logout' && styles.logoutIcon,
                  ]}>
                    <item.icon 
                      size={20} 
                      color={item.id === 'logout' ? '#ff4444' : '#378699'} 
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingTitle,
                      item.id === 'logout' && styles.logoutText,
                    ]}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                </View>
                {item.showArrow && (
                  <Text style={styles.arrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Gatero v1.0.0</Text>
          <Text style={styles.appSlogan}>Đi đâu cũng vô</Text>
        </View>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.avatarEditSection}>
                <TouchableOpacity onPress={handlePickImage} style={styles.avatarEditContainer}>
                  {editedAvatar ? (
                    <Image source={{ uri: editedAvatar }} style={styles.avatarEditImage} />
                  ) : (
                    <View style={styles.avatarEditPlaceholder}>
                      <User size={40} color="white" />
                    </View>
                  )}
                  <View style={styles.cameraIconContainer}>
                    <Camera size={20} color="white" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarEditText}>Chạm để thay đổi ảnh</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên hiển thị</Text>
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Nhập tên của bạn"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tuổi</Text>
                <TextInput
                  style={styles.input}
                  value={editedAge}
                  onChangeText={setEditedAge}
                  placeholder="Nhập tuổi"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Giới tính</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      editedGender === 'male' && styles.genderButtonActive,
                    ]}
                    onPress={() => setEditedGender('male')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        editedGender === 'male' && styles.genderButtonTextActive,
                      ]}
                    >
                      Nam
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      editedGender === 'female' && styles.genderButtonActive,
                    ]}
                    onPress={() => setEditedGender('female')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        editedGender === 'female' && styles.genderButtonTextActive,
                      ]}
                    >
                      Nữ
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>QR ngân hàng</Text>
                <View style={styles.qrEditRow}>
                  {editedQr ? (
                    <Image source={{ uri: editedQr }} style={styles.qrEditPreview} />
                  ) : (
                    <View style={styles.qrEditPreviewPlaceholder}>
                      <QrCode size={28} color="#378699" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={async () => {
                      try {
                        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permissionResult.granted) {
                          Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                        if (!result.canceled && result.assets[0]) {
                          setEditedQr(result.assets[0].uri);
                        }
                      } catch (e) {
                        Alert.alert('Lỗi', 'Không thể chọn ảnh QR.');
                      }
                    }} style={styles.pickQrButton}>
                      <Camera size={16} color="#378699" />
                      <Text style={styles.pickQrButtonText}>Chọn ảnh QR</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Hoặc dán URL ảnh QR..."
                      placeholderTextColor="#999"
                      value={editedQr}
                      onChangeText={setEditedQr}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#378699',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e8f4f8',
    borderRadius: 20,
  },
  editProfileButtonText: {
    color: '#378699',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSection: {
    marginBottom: 32,
  },
  qrCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    gap: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrPlaceholderText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingsList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e8f4f8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutIcon: {
    backgroundColor: '#ffe6e6',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  logoutText: {
    color: '#ff4444',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  appSlogan: {
    fontSize: 12,
    color: '#ccc',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarEditSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarEditContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#378699',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#378699',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarEditText: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#378699',
    borderColor: '#378699',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  qrEditRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  qrEditPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrEditPreviewPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8f4f8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickQrButtonText: {
    color: '#378699',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#378699',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});