import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';
import { INITIAL_ROOMS, RoomItem, RoomMember } from './RoomsView';

export interface ApartmentItem {
  id: string;
  name: string;
  location: string;
  roomsCount: number;
  isActive: boolean;
}

export const INITIAL_APARTMENTS: ApartmentItem[] = [
  {
    id: 'apt-1',
    name: 'Sunrise Apartments',
    location: 'Mangalore, Karnataka',
    roomsCount: 12,
    isActive: true,
  },
  {
    id: 'apt-2',
    name: 'Palm Residency',
    location: 'Kadri, Mangalore',
    roomsCount: 8,
    isActive: false,
  },
  {
    id: 'apt-3',
    name: 'City Homes',
    location: 'Manipal, Udupi',
    roomsCount: 6,
    isActive: false,
  },
  {
    id: 'apt-4',
    name: 'Green Villa',
    location: 'Bejai, Mangalore',
    roomsCount: 4,
    isActive: false,
  },
];

export const INITIAL_MAINTENANCE_REASONS: string[] = [
  'Plumbing',
  'Electrical',
  'Fan repair',
  'Paint',
  'Lift service',
  'Appliance / AC',
  'Carpentry',
  'Cleaning',
  'Water leakage',
];

export interface SettingsViewProps {
  rooms?: RoomItem[];
  onAddRoom?: (newRoom: RoomItem) => void;
  onBack?: () => void;
  apartments?: ApartmentItem[];
  setApartments?: React.Dispatch<React.SetStateAction<ApartmentItem[]>>;
  maintenanceReasons?: string[];
  setMaintenanceReasons?: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SettingsView({
  rooms: propRooms,
  onAddRoom,
  onBack,
  apartments: propApartments,
  setApartments: propSetApartments,
  maintenanceReasons: propMaintenanceReasons,
  setMaintenanceReasons: propSetMaintenanceReasons,
}: SettingsViewProps) {
  const [localApartments, setLocalApartments] = useState<ApartmentItem[]>(INITIAL_APARTMENTS);
  const apartments = propApartments || localApartments;
  const setApartments = propSetApartments || setLocalApartments;
  const [localRooms, setLocalRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const rooms = propRooms || localRooms;
  const [localMaintenanceReasons, setLocalMaintenanceReasons] = useState<string[]>(INITIAL_MAINTENANCE_REASONS);
  const maintenanceReasons = propMaintenanceReasons || localMaintenanceReasons;
  const setMaintenanceReasons = propSetMaintenanceReasons || setLocalMaintenanceReasons;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const [rentCycleDay, setRentCycleDay] = useState('1st of month');
  const [gracePeriod, setGracePeriod] = useState('5 days');
  const [lateFee, setLateFee] = useState('₹500');
  const [autoReminder, setAutoReminder] = useState(true);
  const [maintenanceNotify, setMaintenanceNotify] = useState(true);

  // Add Apartment Modal State
  const [isAddAptModalVisible, setIsAddAptModalVisible] = useState(false);
  const [newAptName, setNewAptName] = useState('');
  const [newAptLocation, setNewAptLocation] = useState('');
  const [newAptRooms, setNewAptRooms] = useState('');

  // Add Room Modal State
  const [isAddRoomModalVisible, setIsAddRoomModalVisible] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newWing, setNewWing] = useState('Floor 2 · East Wing');
  const [newType, setNewType] = useState('1 BHK Deluxe');
  const [newTenant, setNewTenant] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newDeposit, setNewDeposit] = useState('');
  const [newStatus, setNewStatus] = useState<'Occupied' | 'Vacant'>('Vacant');

  // Add Maintenance Reason Modal State
  const [isAddReasonModalVisible, setIsAddReasonModalVisible] = useState(false);
  const [newReasonText, setNewReasonText] = useState('');

  const handleAddReason = () => {
    if (!newReasonText.trim()) {
      Alert.alert('Required', 'Please enter a maintenance reason (e.g. Pest Control).');
      return;
    }
    if (maintenanceReasons.some((r) => r.toLowerCase() === newReasonText.trim().toLowerCase())) {
      Alert.alert('Already Exists', 'This maintenance reason is already in your list.');
      return;
    }
    setMaintenanceReasons([...maintenanceReasons, newReasonText.trim()]);
    setNewReasonText('');
    setIsAddReasonModalVisible(false);
    Alert.alert('Reason Added', `"${newReasonText.trim()}" added to maintenance reasons.`);
  };

  const handleDeleteReason = (reason: string) => {
    Alert.alert(
      'Delete Reason',
      `Are you sure you want to remove "${reason}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMaintenanceReasons(maintenanceReasons.filter((r) => r !== reason));
          },
        },
      ]
    );
  };

  const handleCreateRoom = () => {
    if (!newRoomNumber.trim()) {
      Alert.alert('Required', 'Please enter a room number (e.g. Room 205).');
      return;
    }

    const rentFormatted = newRent.trim()
      ? (newRent.startsWith('₹') ? newRent : `₹${newRent}`)
      : '₹9,000';
    const depositFormatted = newDeposit.trim()
      ? (newDeposit.startsWith('₹') ? newDeposit : `₹${newDeposit}`)
      : '₹18,000';

    const members: RoomMember[] =
      newStatus === 'Vacant' || !newTenant.trim()
        ? []
        : [
            {
              id: Date.now().toString(),
              name: newTenant.trim(),
              role: 'Primary Resident',
              phone: newTenantPhone.trim() || '+91 98000 00000',
            },
          ];

    const newRoom: RoomItem = {
      id: Date.now().toString(),
      roomNumber: newRoomNumber.trim().startsWith('Room')
        ? newRoomNumber.trim()
        : `Room ${newRoomNumber.trim()}`,
      wing: newWing.trim() || 'Floor 2 · North Wing',
      type: newType.trim() || '1 BHK Suite',
      monthlyRent: rentFormatted,
      depositAmount: depositFormatted,
      status: newStatus,
      joinedDate: newStatus !== 'Vacant' ? 'Nov 02, 2026' : undefined,
      members,
    };

    if (onAddRoom) {
      onAddRoom(newRoom);
    } else {
      setLocalRooms([newRoom, ...localRooms]);
    }

    setNewRoomNumber('');
    setNewTenant('');
    setNewTenantPhone('');
    setNewRent('');
    setNewDeposit('');
    setIsAddRoomModalVisible(false);
    Alert.alert('Room Added', `${newRoom.roomNumber} has been added to rooms.`);
  };

  const handleSaveSettings = () => {
    Alert.alert('Settings Saved', 'Apartment and rental preferences updated successfully.');
  };

  const handleAddApartment = () => {
    if (!newAptName.trim() || !newAptRooms.trim()) {
      Alert.alert('Required', 'Please enter apartment name and number of rooms.');
      return;
    }

    const roomsNum = parseInt(newAptRooms, 10) || 1;
    const newApt: ApartmentItem = {
      id: Date.now().toString(),
      name: newAptName.trim(),
      location: newAptLocation.trim() || 'Mangalore, Karnataka',
      roomsCount: roomsNum,
      isActive: false,
    };

    setApartments([...apartments, newApt]);
    setNewAptName('');
    setNewAptLocation('');
    setNewAptRooms('');
    setIsAddAptModalVisible(false);
    Alert.alert('Apartment Added', `${newApt.name} with ${newApt.roomsCount} rooms added.`);
  };

  const handleSetActiveApartment = (id: string, name: string) => {
    setApartments(
      apartments.map((a) => ({
        ...a,
        isActive: a.id === id,
      }))
    );
    Alert.alert('Active Apartment Changed', `${name} is now your primary active property.`);
  };

  const handleDeleteApartment = (id: string, name: string) => {
    Alert.alert(
      'Delete Apartment',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setApartments(apartments.filter((a) => a.id !== id));
            Alert.alert('Deleted', `${name} has been removed.`);
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
        {/* Header Row */}
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
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          <TouchableOpacity
            style={styles.saveHeaderButton}
            onPress={handleSaveSettings}
            activeOpacity={0.85}
          >
            <Text style={styles.saveHeaderButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Section: List of Apartments */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>MY APARTMENTS ({apartments.length})</Text>
          <TouchableOpacity
            style={styles.addAptButton}
            onPress={() => setIsAddAptModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={14} color={Palette.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addAptButtonText}>Add Apartment</Text>
          </TouchableOpacity>
        </View>

        {/* Apartments Cards List */}
        <View style={styles.apartmentsCard}>
          {apartments.map((apt, index) => {
            const isLast = index === apartments.length - 1;
            return (
              <React.Fragment key={apt.id}>
                <View style={styles.apartmentItemRow}>
                  <View style={styles.aptIconCircle}>
                    <MaterialCommunityIcons name="office-building" size={20} color={Palette.primary} />
                  </View>

                  <View style={styles.aptDetailsCol}>
                    <View style={styles.aptTitleRow}>
                      <Text style={styles.aptNameText}>{apt.name}</Text>
                      {apt.isActive && (
                        <Text style={styles.activeTagText}>Active</Text>
                      )}
                    </View>
                    <Text style={styles.aptSubText}>{apt.location}</Text>
                    <Text style={styles.aptRoomsText}>{apt.roomsCount} Rooms</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.aptActionRow}>
                    {!apt.isActive ? (
                      <TouchableOpacity
                        style={styles.setActiveBtn}
                        onPress={() => handleSetActiveApartment(apt.id, apt.name)}
                      >
                        <Text style={styles.setActiveBtnText}>Set Active</Text>
                      </TouchableOpacity>
                    ) : null}

                    {apartments.length > 1 && (
                      <TouchableOpacity
                        style={styles.deleteAptBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleDeleteApartment(apt.id, apt.name)}
                      >
                        <Feather name="trash-2" size={16} color={Palette.status.overdue.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: Rooms Management (Add rooms here to show in Rooms page) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>ROOMS LIST ({rooms.length})</Text>
          <TouchableOpacity
            style={styles.addAptButton}
            onPress={() => setIsAddRoomModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={14} color={Palette.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addAptButtonText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Rooms Cards List in Settings */}
        <View style={styles.apartmentsCard}>
          {rooms.map((rm, idx) => {
            const isLast = idx === rooms.length - 1;
            const isOccupied = rm.status === 'Occupied';
            const isRentDue = rm.status === 'Rent due';
            const isVacant = rm.status === 'Vacant';
            return (
              <React.Fragment key={rm.id}>
                <View style={styles.apartmentItemRow}>
                  <View style={styles.aptIconCircle}>
                    <MaterialCommunityIcons name="door-open" size={20} color={Palette.primary} />
                  </View>

                  <View style={styles.aptDetailsCol}>
                    <View style={styles.aptTitleRow}>
                      <Text style={styles.aptNameText}>{rm.roomNumber}</Text>
                      <Text
                        style={[
                          styles.roomStatusTag,
                          isOccupied && { color: Palette.status.occupied.text },
                          isRentDue && { color: Palette.status.due.text },
                          isVacant && { color: Palette.status.vacant.text },
                        ]}
                      >
                        {rm.status}
                      </Text>
                    </View>
                    <Text style={styles.aptRoomsText}>Rent: {rm.monthlyRent}</Text>
                  </View>
                </View>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: Maintenance Reasons */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>MAINTENANCE REASONS ({maintenanceReasons.length})</Text>
          <TouchableOpacity
            style={styles.addAptButton}
            onPress={() => setIsAddReasonModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={14} color={Palette.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addAptButtonText}>Add Reason</Text>
          </TouchableOpacity>
        </View>

        {/* Reasons Cards List */}
        <View style={styles.apartmentsCard}>
          {maintenanceReasons.map((reason, idx) => {
            const isLast = idx === maintenanceReasons.length - 1;
            return (
              <React.Fragment key={reason}>
                <View style={styles.apartmentItemRow}>
                  <View style={styles.aptIconCircle}>
                    <Feather name="tool" size={18} color={Palette.primary} />
                  </View>

                  <View style={styles.aptDetailsCol}>
                    <Text style={styles.aptNameText}>{reason}</Text>
                    <Text style={styles.aptSubText}>Available in Maintenance Dropdown</Text>
                  </View>

                  {maintenanceReasons.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteAptBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteReason(reason)}
                    >
                      <Feather name="trash-2" size={16} color={Palette.status.overdue.text} />
                    </TouchableOpacity>
                  )}
                </View>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Rent Collection Rules */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>RENT COLLECTION RULES</Text>

          <Text style={styles.fieldLabel}>Rent Due Cycle</Text>
          <TextInput
            style={styles.textInput}
            value={rentCycleDay}
            onChangeText={setRentCycleDay}
            placeholderTextColor={Palette.textMuted}
          />

          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Grace Period</Text>
              <TextInput
                style={styles.textInput}
                value={gracePeriod}
                onChangeText={setGracePeriod}
                placeholderTextColor={Palette.textMuted}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Late Fee</Text>
              <TextInput
                style={styles.textInput}
                value={lateFee}
                onChangeText={setLateFee}
                placeholderTextColor={Palette.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Automated Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>AUTOMATED REMINDERS</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchTitle}>WhatsApp Rent Reminders</Text>
              <Text style={styles.switchSub}>Automated notice 3 days before rent due</Text>
            </View>
            <Switch
              value={autoReminder}
              onValueChange={setAutoReminder}
              trackColor={{ false: Palette.border, true: Palette.primary }}
              thumbColor={Palette.surface}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchTitle}>Maintenance Task Status</Text>
              <Text style={styles.switchSub}>Push updates when repair staff completes work</Text>
            </View>
            <Switch
              value={maintenanceNotify}
              onValueChange={setMaintenanceNotify}
              trackColor={{ false: Palette.border, true: Palette.primary }}
              thumbColor={Palette.surface}
            />
          </View>
        </View>
      </ScrollView>

      {/* Add Apartment Modal */}
      <Modal
        visible={isAddAptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddAptModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddAptModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Apartment</Text>
              <TouchableOpacity onPress={() => setIsAddAptModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Apartment / Building Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Ocean Pearl Residency"
                placeholderTextColor={Palette.textMuted}
                value={newAptName}
                onChangeText={setNewAptName}
              />

              <Text style={styles.inputLabel}>Location / Address</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Kadri Hills, Mangalore"
                placeholderTextColor={Palette.textMuted}
                value={newAptLocation}
                onChangeText={setNewAptLocation}
              />

              <Text style={styles.inputLabel}>Number of Rooms</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 10"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newAptRooms}
                onChangeText={setNewAptRooms}
              />

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleAddApartment}
              >
                <Text style={styles.saveAptBtnText}>Save Apartment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Room Modal (Rooms added here are shown in Rooms page) */}
      <Modal
        visible={isAddRoomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddRoomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddRoomModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Room</Text>
              <TouchableOpacity onPress={() => setIsAddRoomModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Room Number</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Room 205"
                placeholderTextColor={Palette.textMuted}
                value={newRoomNumber}
                onChangeText={setNewRoomNumber}
              />

              <Text style={styles.inputLabel}>Wing / Floor</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Floor 2 · East Wing"
                placeholderTextColor={Palette.textMuted}
                value={newWing}
                onChangeText={setNewWing}
              />

              <Text style={styles.inputLabel}>Room Type</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 1 BHK Deluxe"
                placeholderTextColor={Palette.textMuted}
                value={newType}
                onChangeText={setNewType}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelectRow}>
                {(['Occupied', 'Vacant'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusSelectBtn,
                      newStatus === st && styles.statusSelectBtnActive,
                    ]}
                    onPress={() => setNewStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusSelectText,
                        newStatus === st && styles.statusSelectTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newStatus !== 'Vacant' && (
                <>
                  <Text style={styles.inputLabel}>Primary Resident Name</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={Palette.textMuted}
                    value={newTenant}
                    onChangeText={setNewTenant}
                  />

                  <Text style={styles.inputLabel}>Resident Phone</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. +91 98765 00000"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="phone-pad"
                    value={newTenantPhone}
                    onChangeText={setNewTenantPhone}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Monthly Rent (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 9500"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newRent}
                onChangeText={setNewRent}
              />

              <Text style={styles.inputLabel}>Security Deposit (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 19000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newDeposit}
                onChangeText={setNewDeposit}
              />

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleCreateRoom}
              >
                <Text style={styles.saveAptBtnText}>Save Room</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Maintenance Reason Modal */}
      <Modal
        visible={isAddReasonModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddReasonModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddReasonModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Maintenance Reason</Text>
              <TouchableOpacity onPress={() => setIsAddReasonModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Reason / Issue Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Pest Control, Window repair"
                placeholderTextColor={Palette.textMuted}
                value={newReasonText}
                onChangeText={setNewReasonText}
              />

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleAddReason}
              >
                <Text style={styles.saveAptBtnText}>Save Reason</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  saveHeaderButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveHeaderButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.primary,
    letterSpacing: 0.8,
  },
  addAptButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAptButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  apartmentsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  apartmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  aptIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  aptDetailsCol: {
    flex: 1,
  },
  aptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  aptNameText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Palette.text,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.status.active.text,
  },
  aptSubText: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  aptRoomsText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  aptActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  setActiveBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.primary,
  },
  deleteAptBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.text,
    marginBottom: 8,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
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
    maxHeight: '80%',
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
  saveAptBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveAptBtnText: {
    color: Palette.surface,
    fontSize: 15.5,
    fontWeight: '700',
  },
  roomStatusTag: {
    fontSize: 12,
    fontWeight: '700',
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
});
