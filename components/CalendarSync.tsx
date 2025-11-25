import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import { Calendar as CalendarIcon, RefreshCw, Check } from 'lucide-react-native';

interface CalendarSyncProps {
  dateRange: Date[];
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
  onSyncComplete: (busySlots: TimeSlot[]) => void;
}

interface TimeSlot {
  day: number;
  hour: number;
  minute: number;
}

export default function CalendarSync({
  dateRange,
  startTime,
  endTime,
  onSyncComplete,
}: CalendarSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    const { status } = await Calendar.getCalendarPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Không hỗ trợ',
        'Tính năng đồng bộ lịch không khả dụng trên web. Vui lòng sử dụng ứng dụng di động.'
      );
      return false;
    }

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Cần quyền truy cập',
        'Vui lòng cấp quyền truy cập lịch để sử dụng tính năng này.'
      );
      return false;
    }
    
    return true;
  };

  const syncCalendar = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Không hỗ trợ',
        'Tính năng đồng bộ lịch không khả dụng trên web.'
      );
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    setIsLoading(true);

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      if (calendars.length === 0) {
        Alert.alert('Không tìm thấy lịch', 'Không có lịch nào được tìm th��y trên thiết bị.');
        setIsLoading(false);
        return;
      }

      const busySlots: TimeSlot[] = [];
      const startDate = dateRange[0];
      const endDate = dateRange[dateRange.length - 1];
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      for (const calendar of calendars) {
        const events = await Calendar.getEventsAsync(
          [calendar.id],
          startDate,
          endDate
        );

        for (const event of events) {
          if (!event.startDate || !event.endDate) continue;

          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);

          dateRange.forEach((date, dayIndex) => {
            const dayStart = new Date(date);
            dayStart.setHours(startTime.hour, startTime.minute, 0, 0);
            
            const dayEnd = new Date(date);
            dayEnd.setHours(endTime.hour, endTime.minute, 0, 0);

            if (
              (eventStart <= dayEnd && eventEnd >= dayStart)
            ) {
              const overlapStart = new Date(Math.max(eventStart.getTime(), dayStart.getTime()));
              const overlapEnd = new Date(Math.min(eventEnd.getTime(), dayEnd.getTime()));

              let currentTime = new Date(overlapStart);
              currentTime.setMinutes(Math.floor(currentTime.getMinutes() / 30) * 30);

              while (currentTime < overlapEnd) {
                const hour = currentTime.getHours();
                const minute = currentTime.getMinutes();

                if (
                  hour >= startTime.hour &&
                  (hour < endTime.hour || (hour === endTime.hour && minute < endTime.minute))
                ) {
                  const slotExists = busySlots.some(
                    slot => slot.day === dayIndex && slot.hour === hour && slot.minute === minute
                  );

                  if (!slotExists) {
                    busySlots.push({ day: dayIndex, hour, minute });
                  }
                }

                currentTime.setMinutes(currentTime.getMinutes() + 30);
              }
            }
          });
        }
      }

      onSyncComplete(busySlots);
      setIsSynced(true);
      
      Alert.alert(
        'Đồng bộ thành công',
        `Đã tìm thấy ${busySlots.length} khung giờ bận từ lịch của bạn.`
      );
    } catch (error) {
      console.error('Calendar sync error:', error);
      Alert.alert(
        'Lỗi đồng bộ',
        'Không thể đồng bộ lịch. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webNotice}>
          <CalendarIcon size={16} color="#7f8c8d" />
          <Text style={styles.webNoticeText}>
            Đồng bộ lịch chỉ khả dụng trên ứng dụng di động
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.syncButton,
          isSynced && styles.syncButtonSuccess,
          isLoading && styles.syncButtonLoading,
        ]}
        onPress={syncCalendar}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.syncButtonText}>Đang đồng bộ...</Text>
          </>
        ) : isSynced ? (
          <>
            <Check size={18} color="white" />
            <Text style={styles.syncButtonText}>Đã đồng bộ</Text>
            <RefreshCw size={16} color="white" style={{ marginLeft: 4 }} />
          </>
        ) : (
          <>
            <CalendarIcon size={18} color="white" />
            <Text style={styles.syncButtonText}>Đồng bộ Google Calendar</Text>
          </>
        )}
      </TouchableOpacity>
      
      {isSynced && (
        <Text style={styles.syncHint}>
          Các khung giờ bận đã được tự động bỏ chọn
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#378699',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  syncButtonSuccess: {
    backgroundColor: '#27ae60',
  },
  syncButtonLoading: {
    backgroundColor: '#95a5a6',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  syncHint: {
    fontSize: 12,
    color: '#27ae60',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  webNoticeText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
});
