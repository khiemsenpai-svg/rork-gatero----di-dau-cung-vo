import React, { useState, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  location: string;
  availableSlots?: TimeSlot[];
  budget?: number;
  notes?: string;
  preferredLocation?: string;
}

export interface LedgerEntry {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  note?: string;
  createdAt: string;
  settled?: boolean;
}

export interface GroupLedger {
  entries: LedgerEntry[];
}

export interface Group {
  id: string;
  name: string;
  code: string;
  hostId: string;
  hostName: string;
  hostLocation: string;
  maxMembers: number;
  members: Member[];
  timeRange?: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  };
  desiredLocation?: string;
  hostNotes?: string;
  hostPreferredLocation?: string;
  ledger?: GroupLedger;
  createdAt: string;
}

export const [GroupProvider, useGroups] = createContextHook(() => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      createTestingGroup();
    }
  }, [isLoading]);

  const loadGroups = async () => {
    try {
      const stored = await AsyncStorage.getItem('groups');
      if (stored && stored.trim()) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setGroups(parsed);
          } else {
            console.warn('Invalid groups data format, resetting to empty array');
            setGroups([]);
          }
        } catch (parseError) {
          console.error('Error parsing groups JSON:', parseError);
          setGroups([]);
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroups = async (updatedGroups: Group[]) => {
    try {
      const jsonString = JSON.stringify(updatedGroups);
      await AsyncStorage.setItem('groups', jsonString);
      setGroups(updatedGroups);
    } catch (error) {
      console.error('Error saving groups:', error);
      throw error;
    }
  };

  const generateGroupCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createTestingGroup = async () => {
    const testGroup: Group = {
      id: 'test-group-363636',
      code: '363636',
      name: 'Phòng Testing',
      hostId: 'test-host',
      hostName: 'Test Host',
      hostLocation: 'Hà Nội',
      maxMembers: 999,
      members: [
        {
          id: 'test-member-1',
          name: 'Minh Khiêm',
          email: 'khiem@test.com',
          location: '76 Minh Phụng Quận 6',
          budget: 50000,
          availableSlots: [
            { day: '2025-01-15', startTime: '09:00', endTime: '12:00', isAvailable: true },
            { day: '2025-01-15', startTime: '14:00', endTime: '18:00', isAvailable: true },
            { day: '2025-01-16', startTime: '09:00', endTime: '17:00', isAvailable: true },
          ],
        },
        {
          id: 'test-member-2',
          name: 'Trí Quang',
          email: 'quang@test.com',
          location: '190 Hoà Bình Quận Tân Phú',
          budget: 60000,
          availableSlots: [
            { day: '2025-01-15', startTime: '10:00', endTime: '16:00', isAvailable: true },
            { day: '2025-01-17', startTime: '09:00', endTime: '18:00', isAvailable: true },
          ],
        },
        {
          id: 'test-member-3',
          name: 'Gia Huy',
          email: 'huy@test.com',
          location: '480 Nơ Trang Long Quận Bình Thạnh',
          budget: 50000,
          availableSlots: [
            { day: '2025-01-15', startTime: '13:00', endTime: '17:00', isAvailable: true },
            { day: '2025-01-16', startTime: '10:00', endTime: '15:00', isAvailable: true },
          ],
        },
        {
          id: 'test-member-4',
          name: 'Tấn Bảo',
          email: 'bao@test.com',
          location: '120 Vũ Tùng Quận Bình Thạnh',
          budget: 100000,
          availableSlots: [
            { day: '2025-01-15', startTime: '09:00', endTime: '18:00', isAvailable: true },
            { day: '2025-01-16', startTime: '09:00', endTime: '18:00', isAvailable: true },
          ],
        },
      ],
      desiredLocation: 'quán cafe yên tĩnh',
      hostNotes: 'họp',
      hostPreferredLocation: 'quán cafe yên tĩnh',
      ledger: { entries: [] },
      timeRange: {
        startDate: '2025-01-15',
        endDate: '2025-01-20',
        startTime: '09:00',
        endTime: '18:00',
      },
      createdAt: new Date().toISOString(),
    };

    const existingGroup = groups.find(g => g.code === '363636');
    if (!existingGroup) {
      const updatedGroups = [...groups, testGroup];
      await saveGroups(updatedGroups);
    } else {
      const updatedGroups = groups.map(g => 
        g.code === '363636' ? testGroup : g
      );
      await saveGroups(updatedGroups);
    }
  };

  const createGroup = async (groupData: {
    name: string;
    hostName: string;
    hostLocation: string;
    maxMembers: number;
    timeRange?: Group['timeRange'];
  }) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    
    const newGroup: Group = {
      id: Date.now().toString(),
      code: generateGroupCode(),
      name: groupData.name,
      hostId: user.id,
      hostName: groupData.hostName,
      hostLocation: groupData.hostLocation,
      maxMembers: groupData.maxMembers,
      members: [
        {
          id: user.id,
          name: groupData.hostName,
          email: user.email,
          location: groupData.hostLocation,
        },
      ],
      timeRange: groupData.timeRange,
      ledger: { entries: [] },
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [...groups, newGroup];
    await saveGroups(updatedGroups);
    setCurrentGroup(newGroup);
    return newGroup;
  };

  const joinGroup = async (code: string, memberData: {
    name: string;
    email: string;
    location: string;
  }) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    
    const group = groups.find(g => g.code === code);
    if (!group) {
      throw new Error('Mã nhóm không tồn tại');
    }

    if (group.members.length >= group.maxMembers) {
      throw new Error('Nhóm đã đầy');
    }

    const isTestingRoom = code === '363636';
    
    if (!isTestingRoom && group.members.some(m => m.id === user.id)) {
      throw new Error('Bạn đã tham gia nhóm này rồi');
    }

    const memberId = isTestingRoom 
      ? `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : user.id;

    const newMember: Member = {
      id: memberId,
      name: memberData.name,
      email: memberData.email || user.email,
      location: memberData.location,
    };

    const updatedGroup = {
      ...group,
      members: [...group.members, newMember],
    };

    const updatedGroups = groups.map(g => 
      g.id === group.id ? updatedGroup : g
    );

    await saveGroups(updatedGroups);
    setCurrentGroup(updatedGroup);
    return updatedGroup;
  };

  const updateMemberAvailability = async (
    groupId: string,
    memberId: string,
    availableSlots: TimeSlot[]
  ) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: group.members.map(member => 
            member.id === memberId
              ? { ...member, availableSlots }
              : member
          ),
        };
      }
      return group;
    });

    await saveGroups(updatedGroups);
  };

  const updateMemberBudget = async (
    groupId: string,
    memberId: string,
    budget: number
  ) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: group.members.map(member => 
            member.id === memberId
              ? { ...member, budget }
              : member
          ),
        };
      }
      return group;
    });

    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) {
      setCurrentGroup(updatedGroup);
    }
  };

  const updateDesiredLocation = async (
    groupId: string,
    location: string
  ) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          desiredLocation: location,
        };
      }
      return group;
    });

    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) {
      setCurrentGroup(updatedGroup);
    }
  };

  const updateHostRequirements = async (
    groupId: string,
    notes: string,
    preferredLocation: string
  ) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          hostNotes: notes,
          hostPreferredLocation: preferredLocation,
        };
      }
      return group;
    });

    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) {
      setCurrentGroup(updatedGroup);
    }
  };

  const updateMemberRequirements = async (
    groupId: string,
    memberId: string,
    notes: string,
    preferredLocation: string
  ) => {
    if (!user) throw new Error('Người dùng chưa đăng nhập');
    const updatedGroups = groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: group.members.map(member => 
            member.id === memberId
              ? { ...member, notes, preferredLocation }
              : member
          ),
        };
      }
      return group;
    });

    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) {
      setCurrentGroup(updatedGroup);
    }
  };

  const addBillToLedger = async (
    groupId: string,
    payerId: string,
    memberTotals: { [memberId: string]: number },
    note?: string
  ) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Nhóm không tồn tại');

    const entries: LedgerEntry[] = [];
    Object.entries(memberTotals).forEach(([memberId, amount]) => {
      if (memberId === payerId) return;
      const value = Math.max(0, Math.round(amount));
      if (value > 0) {
        entries.push({
          id: `${Date.now()}-${memberId}-${payerId}-${Math.random().toString(36).slice(2,8)}`,
          fromMemberId: memberId,
          toMemberId: payerId,
          amount: value,
          note,
          createdAt: new Date().toISOString(),
          settled: false,
        });
      }
    });

    const updatedGroups = groups.map(g => {
      if (g.id !== groupId) return g;
      const current = g.ledger?.entries ?? [];
      return {
        ...g,
        ledger: { entries: [...current, ...entries] },
      };
    });

    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) setCurrentGroup(updatedGroup);
    return entries;
  };

  const simplifyDebts = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return [] as Array<{ fromMemberId: string; toMemberId: string; amount: number }>;
    const entries = (group.ledger?.entries || []).filter(e => !e.settled);

    const balance: { [memberId: string]: number } = {};
    group.members.forEach(m => { balance[m.id] = 0; });
    entries.forEach(e => {
      balance[e.fromMemberId] -= e.amount;
      balance[e.toMemberId] += e.amount;
    });

    const debtors: Array<{ id: string; amount: number }> = [];
    const creditors: Array<{ id: string; amount: number }> = [];
    Object.entries(balance).forEach(([id, amt]) => {
      const rounded = Math.round(amt);
      if (rounded < -1) debtors.push({ id, amount: -rounded });
      else if (rounded > 1) creditors.push({ id, amount: rounded });
    });

    debtors.sort((a,b)=>b.amount-a.amount);
    creditors.sort((a,b)=>b.amount-a.amount);

    const settlements: Array<{ fromMemberId: string; toMemberId: string; amount: number }> = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amount, creditors[j].amount);
      settlements.push({ fromMemberId: debtors[i].id, toMemberId: creditors[j].id, amount: pay });
      debtors[i].amount -= pay;
      creditors[j].amount -= pay;
      if (debtors[i].amount <= 1) i++;
      if (creditors[j].amount <= 1) j++;
    }
    return settlements;
  };

  const settleUpAll = async (groupId: string) => {
    const updatedGroups = groups.map(g => {
      if (g.id !== groupId) return g;
      const updatedEntries = (g.ledger?.entries || []).map(e => ({ ...e, settled: true }));
      return { ...g, ledger: { entries: updatedEntries } };
    });
    await saveGroups(updatedGroups);
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) setCurrentGroup(updatedGroup);
  };

  const deleteGroup = async (groupId: string) => {
    const updatedGroups = groups.filter(g => g.id !== groupId);
    await saveGroups(updatedGroups);
    if (currentGroup?.id === groupId) {
      setCurrentGroup(null);
    }
  };

  const getGroupByCode = (code: string) => {
    return groups.find(g => g.code === code);
  };

  const myGroups = useMemo(() => {
    if (!user) return [];
    return groups.filter(g => 
      g.code === '363636' ||
      g.hostId === user.id || 
      g.members.some(m => m.id === user.id)
    );
  }, [groups, user]);

  return {
    groups,
    myGroups,
    currentGroup,
    isLoading,
    createGroup,
    joinGroup,
    deleteGroup,
    updateMemberAvailability,
    updateMemberBudget,
    updateDesiredLocation,
    updateHostRequirements,
    updateMemberRequirements,
    addBillToLedger,
    simplifyDebts,
    settleUpAll,
    getGroupByCode,
    setCurrentGroup,
  };
});