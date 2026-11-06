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
  KeyboardAvoidingView,
  Image,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

export interface RoomsViewProps {
  rooms?: RoomItem[];
  setRooms?: React.Dispatch<React.SetStateAction<RoomItem[]>>;
  onBack?: () => void;
}

export interface RoomMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  imageUri?: string;
}

export interface RoomItem {
  id: string;
  roomNumber: string;
  wing: string;
  type: string;
  monthlyRent: string;
  depositAmount: string;
  status: 'Occupied' | 'Rent due' | 'Vacant';
  joinedDate?: string;
  members: RoomMember[];
}

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
];

export const INITIAL_ROOMS: RoomItem[] = [
  {
    id: '1',
    roomNumber: 'Room 101',
    wing: 'Floor 1 · East Wing',
    type: '1 BHK Master Suite',
    monthlyRent: '₹9,000',
    depositAmount: '₹20,000',
    joinedDate: 'Jan 15, 2026',
    status: 'Occupied',
    members: [
      {
        id: 'm1',
        name: 'Anil Rao',
        role: 'Primary Resident',
        phone: '+91 98450 11223',
        imageUri: SAMPLE_AVATARS[1],
      },
      {
        id: 'm2',
        name: 'Kavita Rao',
        role: 'Spouse / Co-occupant',
        phone: '+91 98450 33445',
        imageUri: SAMPLE_AVATARS[0],
      },
    ],
  },
  {
    id: '2',
    roomNumber: 'Room 102',
    wing: 'Floor 1 · West Wing',
    type: '2 Bed Sharing Room',
    monthlyRent: '₹8,500',
    depositAmount: '₹18,000',
    joinedDate: 'Mar 01, 2026',
    status: 'Rent due',
    members: [
      {
        id: 'm3',
        name: 'Priya Sharma',
        role: 'Primary Resident',
        phone: '+91 98765 43210',
        imageUri: SAMPLE_AVATARS[2],
      },
      {
        id: 'm4',
        name: 'Deepa Sharma',
        role: 'Sister / Co-occupant',
        phone: '+91 98765 67890',
      },
    ],
  },
  {
    id: '3',
    roomNumber: 'Room 103',
    wing: 'Floor 1 · East Wing',
    type: '1 RK Compact Studio',
    monthlyRent: '₹9,000',
    depositAmount: '₹18,000',
    joinedDate: 'Feb 10, 2026',
    status: 'Occupied',
    members: [
      {
        id: 'm5',
        name: 'Kiran Das',
        role: 'Primary Resident',
        phone: '+91 98123 45678',
        imageUri: SAMPLE_AVATARS[3],
      },
    ],
  },
  {
    id: '4',
    roomNumber: 'Room 104',
    wing: 'Floor 1 · North Wing',
    type: '1 BHK Deluxe Suite',
    monthlyRent: '₹9,500',
    depositAmount: '₹19,000',
    joinedDate: 'Apr 05, 2026',
    status: 'Occupied',
    members: [
      {
        id: 'm6',
        name: 'Sana Khan',
        role: 'Primary Resident',
        phone: '+91 97400 99881',
      },
      {
        id: 'm7',
        name: 'Zoya Khan',
        role: 'Co-occupant / Dependent',
        phone: '+91 97400 99882',
      },
    ],
  },
  {
    id: '5',
    roomNumber: 'Room 201',
    wing: 'Floor 2 · East Wing',
    type: '1 BHK Premium Balcony',
    monthlyRent: '₹10,000',
    depositAmount: '₹20,000',
    joinedDate: 'May 12, 2026',
    status: 'Rent due',
    members: [
      {
        id: 'm8',
        name: 'Arjun Kumar',
        role: 'Primary Resident',
        phone: '+91 99001 22334',
      },
    ],
  },
  {
    id: '6',
    roomNumber: 'Room 204',
    wing: 'Floor 2 · West Wing',
    type: '1 BHK Executive Flat',
    monthlyRent: '₹9,500',
    depositAmount: '₹20,000',
    status: 'Vacant',
    members: [],
  },
];

export default function RoomsView({
  rooms: propRooms,
  setRooms: propSetRooms,
  onBack,
}: RoomsViewProps) {
  const [localRooms, setLocalRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const rooms = propRooms || localRooms;
  const setRooms = propSetRooms || setLocalRooms;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const [filter, setFilter] = useState<'All' | 'Occupied' | 'Vacant'>('All');
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);

  // Financial inline editing state
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [editRent, setEditRent] = useState('');
  const [editDeposit, setEditDeposit] = useState('');

  // Add Member state inside Room Details Sheet
  const [isAddMemberActive, setIsAddMemberActive] = useState(false);
  const [memberFormName, setMemberFormName] = useState('');
  const [memberFormPhone, setMemberFormPhone] = useState('');
  const [memberFormImage, setMemberFormImage] = useState<string | null>(null);

  const occupiedCount = rooms.filter((r) => r.status === 'Occupied' || r.status === 'Rent due').length;
  const vacantCount = rooms.filter((r) => r.status === 'Vacant').length;

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'All') return true;
    if (filter === 'Occupied') return room.status === 'Occupied' || room.status === 'Rent due';
    if (filter === 'Vacant') return room.status === 'Vacant';
    return true;
  });

  const handleStartEditFinancials = () => {
    if (!selectedRoom) return;
    setEditRent(selectedRoom.monthlyRent.replace(/[^0-9]/g, ''));
    setEditDeposit(selectedRoom.depositAmount.replace(/[^0-9]/g, ''));
    setIsEditingFinancials(true);
  };

  const handleSaveFinancials = () => {
    if (!selectedRoom) return;
    const cleanRent = editRent.replace(/[^0-9]/g, '');
    const cleanDeposit = editDeposit.replace(/[^0-9]/g, '');

    const newRentFormatted = cleanRent
      ? `₹${Number(cleanRent).toLocaleString('en-IN')}`
      : selectedRoom.monthlyRent;
    const newDepositFormatted = cleanDeposit
      ? `₹${Number(cleanDeposit).toLocaleString('en-IN')}`
      : selectedRoom.depositAmount;

    const updatedRoom: RoomItem = {
      ...selectedRoom,
      monthlyRent: newRentFormatted,
      depositAmount: newDepositFormatted,
    };

    setSelectedRoom(updatedRoom);
    setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)));
    setIsEditingFinancials(false);
    Alert.alert('Updated', 'Monthly rent and deposit updated successfully.');
  };

  const handleOpenAddMember = () => {
    setMemberFormName('');
    setMemberFormPhone('');
    setMemberFormImage(null);
    setIsAddMemberActive(true);
  };

  const handlePickSampleImage = () => {
    Alert.alert('Upload Image', 'Select member photo:', [
      { text: 'Sample Avatar 1', onPress: () => setMemberFormImage(SAMPLE_AVATARS[0]) },
      { text: 'Sample Avatar 2', onPress: () => setMemberFormImage(SAMPLE_AVATARS[1]) },
      { text: 'Sample Avatar 3', onPress: () => setMemberFormImage(SAMPLE_AVATARS[2]) },
      { text: 'Sample Avatar 4', onPress: () => setMemberFormImage(SAMPLE_AVATARS[3]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSaveNewMember = () => {
    if (!selectedRoom) return;
    if (!memberFormName.trim()) {
      Alert.alert('Required', 'Please enter member name.');
      return;
    }
    if (!memberFormPhone.trim()) {
      Alert.alert('Required', 'Please enter member phone number.');
      return;
    }

    const newMem: RoomMember = {
      id: Date.now().toString(),
      name: memberFormName.trim(),
      role: selectedRoom.members.length === 0 ? 'Primary Resident' : 'Co-occupant',
      phone: memberFormPhone.trim(),
      imageUri: memberFormImage || undefined,
    };

    const updatedMembers = [...selectedRoom.members, newMem];
    const updatedRoom: RoomItem = {
      ...selectedRoom,
      status: 'Occupied',
      joinedDate: selectedRoom.joinedDate || 'Nov 02, 2026',
      members: updatedMembers,
    };

    setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)));
    setSelectedRoom(updatedRoom);
    setMemberFormName('');
    setMemberFormPhone('');
    setMemberFormImage(null);
    setIsAddMemberActive(false);
    Alert.alert('Member Added', `${newMem.name} has been added to ${selectedRoom.roomNumber}.`);
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (!selectedRoom) return;
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${memberName} from ${selectedRoom.roomNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedMembers = selectedRoom.members.filter((m) => m.id !== memberId);
            const updatedStatus: RoomItem['status'] =
              updatedMembers.length > 0 ? selectedRoom.status : 'Vacant';
            const updatedRoom: RoomItem = {
              ...selectedRoom,
              status: updatedStatus,
              members: updatedMembers,
            };
            setSelectedRoom(updatedRoom);
            setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)));
            Alert.alert('Member Removed', `${memberName} has been removed.`);
          },
        },
      ]
    );
  };

  const handleDeleteRoom = (roomId: string, roomNumber: string) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete ${roomNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Room',
          style: 'destructive',
          onPress: () => {
            setRooms(rooms.filter((r) => r.id !== roomId));
            setSelectedRoom(null);
            Alert.alert('Deleted', `${roomNumber} has been deleted.`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {/* Top Header with Back button and Title (Add Room moved to Settings) */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={Palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rooms</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'All' && styles.filterPillActive]}
            onPress={() => setFilter('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filter === 'All' && styles.filterPillTextActive]}>
              All ({rooms.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'Occupied' && styles.filterPillActive]}
            onPress={() => setFilter('Occupied')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === 'Occupied' && styles.filterPillTextActive,
              ]}
            >
              Occupied ({occupiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'Vacant' && styles.filterPillActive]}
            onPress={() => setFilter('Vacant')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filter === 'Vacant' && styles.filterPillTextActive]}>
              Vacant ({vacantCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rooms List Card (Border Radius 5px) */}
        <View style={styles.roomsCard}>
          {filteredRooms.map((room, index) => {
            const isLast = index === filteredRooms.length - 1;
            const isOccupied = room.status === 'Occupied';
            const isRentDue = room.status === 'Rent due';
            const isVacant = room.status === 'Vacant';
            const primaryMember = room.members[0];
            const tenantSummary = isVacant
              ? `Vacant · ${room.monthlyRent}`
              : `${primaryMember ? primaryMember.name : 'Resident'} · ${room.monthlyRent}`;

            return (
              <View key={room.id}>
                <TouchableOpacity
                  style={styles.roomItem}
                  activeOpacity={0.7}
                  onPress={() => setSelectedRoom(room)}
                >
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                    <Text style={styles.tenantInfoText}>{tenantSummary}</Text>
                  </View>

                  {/* Status Text (No background box) */}
                  <View style={styles.roomRight}>
                    <View style={styles.statusBadge}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOccupied && styles.occupiedText,
                          isRentDue && styles.rentDueText,
                          isVacant && styles.vacantText,
                        ]}
                      >
                        {room.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Room Details & Room Members Modal Sheet */}
      <Modal
        visible={selectedRoom !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (isAddMemberActive) {
            setIsAddMemberActive(false);
          } else {
            setSelectedRoom(null);
            setIsEditingFinancials(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetOverlay}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (isAddMemberActive) {
                setIsAddMemberActive(false);
              } else {
                setSelectedRoom(null);
                setIsEditingFinancials(false);
              }
            }}
          >
            <View style={styles.sheetBackdrop} />
          </TouchableWithoutFeedback>

          {selectedRoom && (
            <View style={styles.sheetContainer}>
              {/* Top Handle */}
              <View style={styles.sheetHandle} />

              {isAddMemberActive ? (
                /* --- ADD MEMBER VIEW (Embedded inside sheet to fix iOS modal conflict) --- */
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        style={styles.sheetCloseBtn}
                        onPress={() => setIsAddMemberActive(false)}
                        activeOpacity={0.7}
                      >
                        <Feather name="arrow-left" size={18} color={Palette.text} />
                      </TouchableOpacity>
                      <View>
                        <Text style={styles.sheetRoomTitle}>Add Member</Text>
                        <Text style={styles.sheetRoomSub}>{selectedRoom.roomNumber}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.sheetCloseBtn}
                      onPress={() => setIsAddMemberActive(false)}
                    >
                      <Feather name="x" size={20} color={Palette.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                    {/* Name */}
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor={Palette.textMuted}
                      value={memberFormName}
                      onChangeText={setMemberFormName}
                    />

                    {/* Phone No */}
                    <Text style={styles.inputLabel}>Phone No</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor={Palette.textMuted}
                      keyboardType="phone-pad"
                      value={memberFormPhone}
                      onChangeText={setMemberFormPhone}
                    />

                    {/* Upload Image */}
                    <Text style={styles.inputLabel}>Upload Image</Text>
                    {memberFormImage ? (
                      <View style={styles.uploadedPreviewContainer}>
                        <Image source={{ uri: memberFormImage }} style={styles.uploadedAvatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.photoUploadedText}>Photo selected</Text>
                          <TouchableOpacity onPress={handlePickSampleImage}>
                            <Text style={styles.changePhotoText}>Change photo</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setMemberFormImage(null)}>
                          <Feather name="x-circle" size={20} color={Palette.status.overdue.text} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadBox}
                        activeOpacity={0.7}
                        onPress={handlePickSampleImage}
                      >
                        <Feather name="camera" size={22} color={Palette.primary} />
                        <Text style={styles.uploadBoxText}>Tap to upload member photo</Text>
                        <Text style={styles.uploadBoxSub}>Select profile image</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.saveMemberBtn}
                      activeOpacity={0.85}
                      onPress={handleSaveNewMember}
                    >
                      <Text style={styles.saveMemberBtnText}>Add Member</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              ) : (
                /* --- ROOM DETAILS VIEW --- */
                <>
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.sheetRoomTitle}>{selectedRoom.roomNumber}</Text>
                        <View style={styles.statusBadge}>
                          <Text
                            style={[
                              styles.statusBadgeText,
                              selectedRoom.status === 'Occupied' && styles.occupiedText,
                              selectedRoom.status === 'Rent due' && styles.rentDueText,
                              selectedRoom.status === 'Vacant' && styles.vacantText,
                            ]}
                          >
                            {selectedRoom.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.sheetCloseBtn}
                      onPress={() => {
                        setSelectedRoom(null);
                        setIsEditingFinancials(false);
                      }}
                    >
                      <Feather name="x" size={20} color={Palette.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                    {/* Rent & Deposit Financial Summary (Clickable to Edit) */}
                    {isEditingFinancials ? (
                      <View style={styles.financialEditCard}>
                        <View style={styles.financialEditHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="edit-3" size={15} color={Palette.primary} />
                            <Text style={styles.financialEditTitle}>Edit Rent & Deposit</Text>
                          </View>
                          <TouchableOpacity onPress={() => setIsEditingFinancials(false)}>
                            <Feather name="x" size={18} color={Palette.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.financialEditRow}>
                          <View style={styles.financialEditCol}>
                            <Text style={styles.finInputLabel}>Monthly Rent (₹)</Text>
                            <TextInput
                              style={styles.financialInput}
                              value={editRent}
                              onChangeText={setEditRent}
                              keyboardType="numeric"
                              placeholder="9000"
                              placeholderTextColor={Palette.textMuted}
                              autoFocus
                            />
                          </View>
                          <View style={styles.financialEditCol}>
                            <Text style={styles.finInputLabel}>Deposit (₹)</Text>
                            <TextInput
                              style={styles.financialInput}
                              value={editDeposit}
                              onChangeText={setEditDeposit}
                              keyboardType="numeric"
                              placeholder="20000"
                              placeholderTextColor={Palette.textMuted}
                            />
                          </View>
                        </View>

                        <View style={styles.financialEditActions}>
                          <TouchableOpacity
                            style={styles.financialCancelBtn}
                            onPress={() => setIsEditingFinancials(false)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.financialCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.financialSaveBtn}
                            onPress={handleSaveFinancials}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.financialSaveText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.financialRow}>
                        <TouchableOpacity
                          style={styles.financialBox}
                          activeOpacity={0.7}
                          onPress={handleStartEditFinancials}
                        >
                          <Text style={styles.finLabel}>Monthly Rent</Text>
                          <Text style={styles.finValue}>{selectedRoom.monthlyRent}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.financialBox}
                          activeOpacity={0.7}
                          onPress={handleStartEditFinancials}
                        >
                          <Text style={styles.finLabel}>Deposit</Text>
                          <Text style={styles.finValue}>{selectedRoom.depositAmount}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Room Joined Date (Strictly Room Joined Date) */}
                    {selectedRoom.joinedDate ? (
                      <View style={styles.leaseBox}>
                        <Feather name="calendar" size={15} color={Palette.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.leaseText}>Room joined: {selectedRoom.joinedDate}</Text>
                      </View>
                    ) : null}

                    {/* Room Members Section (No + icon on button) */}
                    <View style={styles.membersSectionHeaderRow}>
                      <Text style={styles.membersSectionTitle}>
                        ROOM MEMBERS ({selectedRoom.members.length})
                      </Text>
                      <TouchableOpacity
                        style={styles.addMemberBtn}
                        onPress={handleOpenAddMember}
                      >
                        <Text style={styles.addMemberBtnText}>Add Member</Text>
                      </TouchableOpacity>
                    </View>

                    {selectedRoom.members.length === 0 ? (
                      <View style={styles.emptyMembersCard}>
                        <MaterialCommunityIcons name="account-group-outline" size={40} color={Palette.secondary} />
                        <Text style={styles.emptyMembersTitle}>No Residents Assigned</Text>
                        <Text style={styles.emptyMembersSub}>
                          This room is currently vacant and ready for new occupants.
                        </Text>
                        <TouchableOpacity
                          style={styles.assignResidentBtn}
                          onPress={handleOpenAddMember}
                        >
                          <Text style={styles.assignResidentBtnText}>Assign Resident</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      selectedRoom.members.map((member) => (
                        <View key={member.id} style={styles.memberCard}>
                          <View style={styles.memberTopRow}>
                            <View style={styles.memberAvatarCircle}>
                              {member.imageUri ? (
                                <Image source={{ uri: member.imageUri }} style={styles.memberAvatarImage} />
                              ) : (
                                <Text style={styles.memberAvatarInitial}>{member.name.charAt(0)}</Text>
                              )}
                            </View>
                            <View style={styles.memberInfoCol}>
                              <Text style={styles.memberName}>{member.name}</Text>
                              <Text style={styles.memberRole}>{member.role}</Text>
                            </View>

                            {/* Call & Delete Actions (No background box) */}
                            <View style={styles.memberActionsRow}>
                              <TouchableOpacity
                                style={styles.memberCallBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={() => Alert.alert('Call Member', `Dialing ${member.name} (${member.phone})`)}
                              >
                                <Feather name="phone" size={18} color={Palette.primary} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.memberDeleteBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={() => handleDeleteMember(member.id, member.name)}
                              >
                                <Feather name="trash-2" size={18} color={Palette.status.overdue.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))
                    )}

                    {/* Bottom Action Buttons */}
                    <View style={styles.sheetActionsRow}>
                      <TouchableOpacity
                        style={styles.sheetBtnSecondary}
                        onPress={() =>
                          Alert.alert(
                            'Lease Agreement',
                            `Viewing digital tenancy agreement for ${selectedRoom.roomNumber}.`
                          )
                        }
                      >
                        <Text style={styles.sheetBtnSecondaryText}>Agreement</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.sheetBtnPrimary}
                        onPress={() => {
                          if (selectedRoom.members.length > 0) {
                            const lead = selectedRoom.members[0];
                            Alert.alert('Contacting Resident', `Calling ${lead.name} (${lead.phone})`);
                          } else {
                            handleOpenAddMember();
                          }
                        }}
                      >
                        <Feather
                          name={selectedRoom.members.length > 0 ? 'phone' : 'user-plus'}
                          size={15}
                          color={Palette.surface}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.sheetBtnPrimaryText}>
                          {selectedRoom.members.length > 0 ? 'Call Primary' : 'Assign Resident'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Delete Room Button */}
                    <TouchableOpacity
                      style={styles.deleteRoomButton}
                      onPress={() => handleDeleteRoom(selectedRoom.id, selectedRoom.roomNumber)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={15} color={Palette.status.overdue.text} style={{ marginRight: 6 }} />
                      <Text style={styles.deleteRoomButtonText}>Delete Room</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.3,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  filterPillTextActive: {
    color: Palette.surface,
    fontWeight: '700',
  },
  roomsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  roomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  roomInfo: {
    flex: 1,
    paddingRight: 8,
  },
  roomNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  tenantInfoText: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  roomRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  occupiedText: {
    color: Palette.status.occupied.text,
  },
  rentDueText: {
    color: Palette.status.due.text,
  },
  vacantText: {
    color: Palette.status.vacant.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 39, 34, 0.45)',
  },
  sheetContainer: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Palette.border,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  sheetRoomTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.text,
  },
  sheetRoomSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 3,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  financialBox: {
    flex: 1,
    backgroundColor: Palette.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  finBoxTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  finLabel: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  finValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 2,
  },
  finSub: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  financialEditCard: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.primary,
    padding: 14,
    marginBottom: 12,
  },
  financialEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  financialEditTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  financialEditRow: {
    flexDirection: 'row',
    gap: 12,
  },
  financialEditCol: {
    flex: 1,
  },
  finInputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  financialInput: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  financialEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  financialCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  financialCancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  financialSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 7,
    backgroundColor: Palette.primary,
  },
  financialSaveText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.surface,
  },
  leaseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 18,
  },
  leaseText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.text,
  },
  membersSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membersSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
    letterSpacing: 0.8,
  },
  addMemberBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  addMemberBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  emptyMembersCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyMembersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyMembersSub: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  assignResidentBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  assignResidentBtnText: {
    color: Palette.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  memberCard: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 10,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.primary,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  memberInfoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  memberRole: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  memberActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberCallBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDeleteBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 10,
  },
  memberMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItemText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  sheetBtnSecondary: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnSecondaryText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.primary,
  },
  sheetBtnPrimary: {
    flex: 1.5,
    backgroundColor: Palette.primary,
    borderRadius: 10,
    flexDirection: 'row',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimaryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.surface,
  },
  deleteRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FDECEB',
    borderWidth: 1,
    borderColor: '#F5C2C0',
  },
  deleteRoomButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
    marginVertical: 6,
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
    marginTop: 6,
  },
  uploadBoxSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  uploadedPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  uploadedAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  photoUploadedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
  changePhotoText: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  uploadedDocContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.background,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 10,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  docFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.text,
  },
  docFileSize: {
    fontSize: 11.5,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  saveMemberBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  saveMemberBtnText: {
    color: Palette.surface,
    fontSize: 15.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 39, 34, 0.45)',
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: Palette.text,
  },
  statusSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statusSelectBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  statusSelectText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  statusSelectTextActive: {
    color: Palette.surface,
    fontWeight: '700',
  },
  saveRoomBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveRoomBtnText: {
    color: Palette.surface,
    fontSize: 15.5,
    fontWeight: '700',
  },
});
