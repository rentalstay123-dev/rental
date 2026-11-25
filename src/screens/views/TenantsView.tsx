import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { formatShortDate } from '../../utils/finance';

interface TenantsViewProps {
  onBack?: () => void;
}

interface Resident {
  id: string;
  name: string;
  room: string;
  rent: string;
  phone: string;
  moveIn: string;
  status: 'Active' | 'Ending Soon';
}

export default function TenantsView({ onBack }: TenantsViewProps) {
  const { rooms, upsertSingleRoom, settings, refreshWorkspace } = useAppData();

  const residents: Resident[] = React.useMemo(
    () =>
      rooms
        .filter((r) => r.status !== 'Vacant' && r.members.length > 0)
        .flatMap((r) =>
          r.members.map((m) => ({
            id: `${r.id}-${m.id}`,
            name: m.name,
            room: r.roomNumber,
            rent: r.monthlyRent,
            phone: m.phone,
            moveIn: r.joinedDate || 'This Month',
            status: (r.status === 'Rent due' ? 'Ending Soon' : 'Active') as Resident['status'],
          }))
        ),
    [rooms]
  );

  const [filter, setFilter] = useState<'All' | 'Active' | 'Ending Soon'>('All');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const filteredResidents = residents.filter((r) => {
    const matchesFilter = filter === 'All' ? true : r.status === filter;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    return matchesFilter && matchesSearch;
  });

  const handleAddResident = () => {
    if (!newName.trim() || !newRoom.trim() || !newRent.trim()) {
      Alert.alert('Required', 'Please enter resident name, room number, and rent');
      return;
    }
    const formattedRoom = newRoom.trim().startsWith('Room') ? newRoom.trim() : `Room ${newRoom.trim()}`;
    const existingRoom = rooms.find(
      (r) => r.roomNumber.toLowerCase() === formattedRoom.toLowerCase()
    );
    const rentNum = parseInt(newRent.replace(/[^0-9]/g, ''), 10) || 9000;
    const formattedRent = `₹${rentNum.toLocaleString('en-IN')}`;
    const member = {
      id: `m-${Date.now()}`,
      name: newName.trim(),
      role: 'Primary Resident',
      phone: newPhone.trim() || '+91 98000 00000',
    };

    if (existingRoom) {
      void upsertSingleRoom({
        ...existingRoom,
        status: 'Occupied',
        monthlyRent: formattedRent,
        joinedDate: existingRoom.joinedDate || formatShortDate(),
        members: [...existingRoom.members, member],
      });
    } else {
      const floor = settings.floors[0] || 'Floor 1';
      void upsertSingleRoom({
        id: `${Date.now()}`,
        roomNumber: formattedRoom,
        floor,
        wing: floor,
        type: settings.roomTypes[0] || '1 BHK',
        monthlyRent: formattedRent,
        depositAmount: `₹${(rentNum * 2).toLocaleString('en-IN')}`,
        status: 'Occupied',
        joinedDate: formatShortDate(),
        members: [member],
      });
    }

    setNewName('');
    setNewRoom('');
    setNewRent('');
    setNewPhone('');
    setIsAddModalOpen(false);
    Alert.alert('Resident Added', `${member.name} assigned to ${formattedRoom}.`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.outerScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.accentText}
            colors={[Palette.accentText]}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Residents</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={17} color={Palette.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by resident name, room, phone..."
            placeholderTextColor={Palette.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={Palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Active', 'Ending Soon'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Residents List */}
        {filteredResidents.map((resident) => {
          const isEnding = resident.status === 'Ending Soon';
          return (
            <View key={resident.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.residentAvatar}>
                  <Text style={styles.avatarInitial}>{resident.name.charAt(0)}</Text>
                </View>
                <View style={styles.residentMain}>
                  <Text style={styles.residentName}>{resident.name}</Text>
                  <Text style={styles.residentSub}>
                    {resident.room} · Since {resident.moveIn}
                  </Text>
                </View>
                <View style={[styles.badge, isEnding ? styles.badgeEnding : styles.badgeActive]}>
                  <Text
                    style={[
                      styles.badgeText,
                      isEnding ? styles.badgeTextEnding : styles.badgeTextActive,
                    ]}
                  >
                    {resident.status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetailsRow}>
                <View>
                  <Text style={styles.detailLabel}>Monthly Rent</Text>
                  <Text style={styles.detailValue}>{resident.rent}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{resident.phone}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={() => Alert.alert('Call Resident', `Calling ${resident.name} at ${resident.phone}`)}
                  activeOpacity={0.7}
                >
                  <Feather name="phone" size={14} color={Palette.accentText} style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnSecondaryText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => Alert.alert('Lease Agreement', `Viewing digital agreement for ${resident.name} (${resident.room})`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnPrimaryText}>View Agreement</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        </View>
      </ScrollView>

      {/* Add Resident Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddModalOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Resident</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Hegde"
                placeholderTextColor={Palette.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Room Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Room 204"
                placeholderTextColor={Palette.textMuted}
                value={newRoom}
                onChangeText={setNewRoom}
              />

              <Text style={styles.inputLabel}>Monthly Rent (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 9500"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newRent}
                onChangeText={setNewRent}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98765 00000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsAddModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddResident}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>Add Resident</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: Palette.background,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  addButtonText: {
    color: Palette.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  residentAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.accentText,
  },
  residentMain: {
    flex: 1,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  residentSub: {
    fontSize: 12.5,
    color: Palette.textSecondary,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  badgeActive: {
    backgroundColor: Palette.status.active.bg,
  },
  badgeEnding: {
    backgroundColor: Palette.status.pending.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: Palette.status.active.text,
  },
  badgeTextEnding: {
    color: Palette.status.pending.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 12,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.accentText,
  },
  actionBtnPrimary: {
    flex: 1.5,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.text,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  cancelButtonText: {
    color: Palette.textSecondary,
    fontWeight: '600',
    fontSize: 13.5,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
  },
  saveButtonText: {
    color: Palette.onPrimary,
    fontWeight: '700',
    fontSize: 13.5,
  },
});

