import { router } from 'expo-router';
import { Plus, Users, Calendar, Trash2 } from 'lucide-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useGroups } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';

export default function FriendsScreen() {
  const { user } = useAuth();
  const { myGroups, isLoading, deleteGroup, setCurrentGroup } = useGroups();

  const handleCreateGroup = () => {
    router.push('/create-group');
  };

  const handleJoinGroup = () => {
    router.push('/join-group');
  };

  const handleViewGroup = (group: any) => {
    setCurrentGroup(group);
    router.push('/group-detail');
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      'Xóa nhóm',
      `Bạn có chắc muốn xóa nhóm "${groupName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => deleteGroup(groupId)
        },
      ]
    );
  };

  return (
    <TabScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={handleCreateGroup}
          >
            <Plus size={20} color="white" />
            <Text style={styles.createButtonText}>Tạo nhóm mới</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={handleJoinGroup}
          >
            <Users size={20} color="#378699" />
            <Text style={styles.joinButtonText}>Tham gia nhóm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>Nhóm của bạn</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#378699" />
            </View>
          ) : myGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Chưa có nhóm nào</Text>
              <Text style={styles.emptyStateSubtext}>
                Tạo nhóm mới hoặc tham gia nhóm để bắt đầu!
              </Text>
            </View>
          ) : (
            <View style={styles.groupsList}>
              {myGroups.map((group) => (
                <TouchableOpacity 
                  key={group.id} 
                  style={styles.groupCard}
                  onPress={() => handleViewGroup(group)}
                  activeOpacity={0.7}
                >
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupInfo}>
                        {group.members.length} thành viên • Mã: {group.code}
                      </Text>
                      {group.hostId === user?.id && (
                        <View style={styles.hostBadge}>
                          <Text style={styles.hostBadgeText}>Host</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.groupActions}>
                      {group.hostId === user?.id && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id, group.name);
                          }}
                        >
                          <Trash2 size={18} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                      <View style={styles.groupIcon}>
                        <Users size={20} color="#378699" />
                      </View>
                    </View>
                  </View>

                  {group.timeRange && (
                    <View style={styles.timeRangeInfo}>
                      <Calendar size={14} color="#378699" />
                      <Text style={styles.timeRangeText}>
                        Lịch rảnh: {group.timeRange.startDate} - {group.timeRange.endDate}
                      </Text>
                    </View>
                  )}

                  <View style={styles.groupFooter}>
                    <Text style={styles.viewDetailsText}>Nhấn để xem chi tiết →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButton: {
    backgroundColor: '#378699',
  },
  joinButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#378699',
  },
  createButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  joinButtonText: {
    color: '#378699',
    fontSize: 15,
    fontWeight: '600',
  },
  groupsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  groupsList: {
    gap: 16,
  },
  groupCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  groupInfo: {
    fontSize: 14,
    color: '#666',
  },
  groupIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e8f4f8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostingEvent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378699',
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  joinEventButton: {
    backgroundColor: '#378699',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinEventButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  hostButton: {
    backgroundColor: '#e8f4f8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  hostButtonText: {
    color: '#378699',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  hostBadge: {
    backgroundColor: '#378699',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  hostBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  timeRangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
  },
  groupFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#378699',
    fontWeight: '500',
  },
});