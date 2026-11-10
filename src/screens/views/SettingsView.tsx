import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import {
  INITIAL_FLOORS,
  INITIAL_ROOMS,
  RoomItem,
  RoomMember,
  extractFloorNumber,
  formatFloorLabel,
  getDefaultNextRoomNumber,
  getRoomFloor,
  matchesFloorName,
  sortRoomNumbers,
} from './RoomsView';

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

export const INITIAL_ROOM_TYPES: string[] = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  'Studio / 1 RK',
];

export interface SettingsViewProps {
  rooms?: RoomItem[];
  onAddRoom?: (newRoom: RoomItem) => void;
  onAddRooms?: (newRooms: RoomItem[]) => void;
  onBack?: () => void;
  maintenanceReasons?: string[];
  setMaintenanceReasons?: React.Dispatch<React.SetStateAction<string[]>>;
  roomTypes?: string[];
  setRoomTypes?: React.Dispatch<React.SetStateAction<string[]>>;
  floors?: string[];
  setFloors?: React.Dispatch<React.SetStateAction<string[]>>;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const DEFAULT_RENT_BY_TYPE: Record<string, { rent: string; deposit: string }> = {
  '1bhk': { rent: '₹9,500', deposit: '₹19,000' },
  '2bhk': { rent: '₹12,500', deposit: '₹25,000' },
  '3bhk': { rent: '₹18,500', deposit: '₹37,000' },
  studio1rk: { rent: '₹7,500', deposit: '₹15,000' },
};

const getDefaultFinancialsForType = (type: string): { rent: string; deposit: string } => {
  const key = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (DEFAULT_RENT_BY_TYPE[key]) return DEFAULT_RENT_BY_TYPE[key];
  if (key.includes('3bhk')) return DEFAULT_RENT_BY_TYPE['3bhk'];
  if (key.includes('2bhk')) return DEFAULT_RENT_BY_TYPE['2bhk'];
  if (key.includes('studio') || key.includes('1rk')) return DEFAULT_RENT_BY_TYPE.studio1rk;
  return { rent: '₹9,000', deposit: '₹18,000' };
};

const sortFloorsList = (list: string[]): string[] =>
  [...list].sort((a, b) => {
    const numA = extractFloorNumber(a);
    const numB = extractFloorNumber(b);
    if (numA !== null && numB !== null) return numA - numB;
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return a.localeCompare(b);
  });

export default function SettingsView({
  rooms: propRooms,
  onAddRoom,
  onAddRooms,
  onBack,
  maintenanceReasons: propMaintenanceReasons,
  setMaintenanceReasons: propSetMaintenanceReasons,
  roomTypes: propRoomTypes,
  setRoomTypes: propSetRoomTypes,
  floors: propFloors,
  setFloors: propSetFloors,
}: SettingsViewProps) {
  const [localRooms, setLocalRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const rooms = propRooms || localRooms;
  const [localMaintenanceReasons, setLocalMaintenanceReasons] = useState<string[]>(INITIAL_MAINTENANCE_REASONS);
  const maintenanceReasons = propMaintenanceReasons || localMaintenanceReasons;
  const setMaintenanceReasons = propSetMaintenanceReasons || setLocalMaintenanceReasons;
  const [localRoomTypes, setLocalRoomTypes] = useState<string[]>(INITIAL_ROOM_TYPES);
  const roomTypes = propRoomTypes || localRoomTypes;
  const setRoomTypes = propSetRoomTypes || setLocalRoomTypes;
  const [localFloors, setLocalFloors] = useState<string[]>(INITIAL_FLOORS);
  const floors = propFloors || localFloors;
  const setFloors = propSetFloors || setLocalFloors;

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

  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Add Floor Modal State
  const [isAddFloorModalVisible, setIsAddFloorModalVisible] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorRoomsCount, setNewFloorRoomsCount] = useState('');
  const [newFloorDefaultType, setNewFloorDefaultType] = useState(roomTypes[0] || '1 BHK');
  const [newFloorRent, setNewFloorRent] = useState('');
  const [newFloorDeposit, setNewFloorDeposit] = useState('');

  // Add Room Modal State
  const [isAddRoomModalVisible, setIsAddRoomModalVisible] = useState(false);
  const [newRoomFloor, setNewRoomFloor] = useState(floors[0] || 'Floor 1');
  const [isRoomFloorDropdownOpen, setIsRoomFloorDropdownOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newWingSuffix, setNewWingSuffix] = useState('');
  const [newType, setNewType] = useState(roomTypes[0] || '1 BHK');
  const [isRoomTypeDropdownOpen, setIsRoomTypeDropdownOpen] = useState(false);
  const [newTenant, setNewTenant] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newDeposit, setNewDeposit] = useState('');
  const [newStatus, setNewStatus] = useState<'Occupied' | 'Vacant'>('Vacant');

  // Add Room Type Modal State
  const [isAddRoomTypeModalVisible, setIsAddRoomTypeModalVisible] = useState(false);
  const [newRoomTypeText, setNewRoomTypeText] = useState('');

  // Add Maintenance Reason Modal State
  const [isAddReasonModalVisible, setIsAddReasonModalVisible] = useState(false);
  const [newReasonText, setNewReasonText] = useState('');

  const appendRooms = (created: RoomItem[]) => {
    if (created.length === 0) return;
    if (created.length === 1 && onAddRoom && !onAddRooms) {
      onAddRoom(created[0]);
      return;
    }
    if (onAddRooms) {
      onAddRooms(created);
    } else if (onAddRoom) {
      created.forEach((rm) => onAddRoom(rm));
    } else {
      setLocalRooms((prev) => [...prev, ...created]);
    }
  };

  const handleOpenAddFloorModal = () => {
    const numericFloors = floors
      .map((fl) => extractFloorNumber(fl))
      .filter((n): n is number => n !== null);
    const nextFloorNum = numericFloors.length > 0 ? Math.max(...numericFloors) + 1 : floors.length + 1;
    setNewFloorName(`Floor ${nextFloorNum}`);
    setNewFloorRoomsCount('');
    setNewFloorDefaultType(roomTypes[0] || '1 BHK');
    setNewFloorRent('');
    setNewFloorDeposit('');
    setModalError(null);
    setIsAddFloorModalVisible(true);
  };

  const handleAddFloor = () => {
    const formatted = formatFloorLabel(newFloorName);
    if (!formatted) {
      setModalError('Please enter a floor name or number (e.g. Floor 4).');
      return;
    }
    if (floors.some((fl) => matchesFloorName(fl, formatted))) {
      setModalError(`${formatted} is already in your floors list.`);
      return;
    }

    const parsedCount = newFloorRoomsCount.trim() ? parseInt(newFloorRoomsCount.trim(), 10) : 0;
    if (newFloorRoomsCount.trim() && (Number.isNaN(parsedCount) || parsedCount < 0)) {
      setModalError('Please enter a valid number of rooms.');
      return;
    }
    if (parsedCount > 50) {
      setModalError('You can auto-create up to 50 rooms per floor at once.');
      return;
    }

    const updatedFloors = sortFloorsList([...floors, formatted]);
    const floorIdx = Math.max(
      0,
      updatedFloors.findIndex((fl) => matchesFloorName(fl, formatted))
    );
    setFloors(updatedFloors);

    const createdRooms: RoomItem[] = [];
    if (parsedCount > 0) {
      const defaults = getDefaultFinancialsForType(newFloorDefaultType || roomTypes[0] || '1 BHK');
      const rentFormatted = newFloorRent.trim()
        ? newFloorRent.trim().startsWith('₹')
          ? newFloorRent.trim()
          : `₹${Number(newFloorRent.replace(/[^0-9]/g, '') || 9000).toLocaleString('en-IN')}`
        : defaults.rent;
      const depositFormatted = newFloorDeposit.trim()
        ? newFloorDeposit.trim().startsWith('₹')
          ? newFloorDeposit.trim()
          : `₹${Number(newFloorDeposit.replace(/[^0-9]/g, '') || 18000).toLocaleString('en-IN')}`
        : defaults.deposit;

      const baseTimestamp = Date.now();
      for (let i = 0; i < parsedCount; i++) {
        const roomNumber = getDefaultNextRoomNumber(
          formatted,
          [...rooms, ...createdRooms],
          floorIdx
        );
        createdRooms.push({
          id: `${baseTimestamp}-${i + 1}`,
          roomNumber,
          floor: formatted,
          wing: formatted,
          type: newFloorDefaultType || roomTypes[0] || '1 BHK',
          monthlyRent: rentFormatted,
          depositAmount: depositFormatted,
          status: 'Vacant',
          members: [],
        });
      }
      appendRooms(createdRooms);
    }

    setNewFloorName('');
    setNewFloorRoomsCount('');
    setModalError(null);
    setIsAddFloorModalVisible(false);
    setStatusNotice(
      createdRooms.length > 0
        ? `Added ${formatted} with ${createdRooms.length} rooms (${createdRooms[0].roomNumber}${
            createdRooms.length > 1
              ? ` to ${createdRooms[createdRooms.length - 1].roomNumber}`
              : ''
          }).`
        : `Added ${formatted}. First room will default to ${getDefaultNextRoomNumber(
            formatted,
            rooms,
            floorIdx
          )}.`
    );
  };

  const handleDeleteFloor = (floorName: string) => {
    if (floors.length <= 1) {
      setStatusNotice('You must keep at least one floor configured.');
      return;
    }
    const assignedRoomsCount = rooms.filter((r) =>
      matchesFloorName(getRoomFloor(r), floorName)
    ).length;
    setConfirmDialog({
      title: 'Delete Floor',
      message:
        assignedRoomsCount > 0
          ? `Remove "${floorName}" from Settings? ${assignedRoomsCount} existing rooms on this floor will remain until deleted.`
          : `Are you sure you want to remove "${floorName}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setFloors(floors.filter((f) => !matchesFloorName(f, floorName)));
        setStatusNotice(`"${floorName}" removed from configured floors.`);
        setConfirmDialog(null);
      },
    });
  };

  const handleOpenAddRoomModal = () => {
    const defaultFloor = floors[0] || 'Floor 1';
    const floorIdx = Math.max(0, floors.indexOf(defaultFloor));
    const defaultRoomNo = getDefaultNextRoomNumber(defaultFloor, rooms, floorIdx);
    setNewRoomFloor(defaultFloor);
    setNewRoomNumber(defaultRoomNo);
    setNewWingSuffix('');
    setNewType(roomTypes[0] || '1 BHK');
    setNewStatus('Vacant');
    setNewTenant('');
    setNewTenantPhone('');
    setNewRent('');
    setNewDeposit('');
    setIsRoomFloorDropdownOpen(false);
    setIsRoomTypeDropdownOpen(false);
    setModalError(null);
    setIsAddRoomModalVisible(true);
  };

  const handleSelectRoomFloorInModal = (floorName: string) => {
    const floorIdx = Math.max(
      0,
      floors.findIndex((f) => matchesFloorName(f, floorName))
    );
    setNewRoomFloor(floorName);
    setNewRoomNumber(getDefaultNextRoomNumber(floorName, rooms, floorIdx));
    setIsRoomFloorDropdownOpen(false);
    if (modalError) setModalError(null);
  };

  const handleAddRoomType = () => {
    if (!newRoomTypeText.trim()) {
      setModalError('Please enter a room type (e.g. 4 BHK, Studio, Penthouse).');
      return;
    }
    if (roomTypes.some((t) => t.toLowerCase() === newRoomTypeText.trim().toLowerCase())) {
      setModalError('This room type is already in your list.');
      return;
    }
    const addedType = newRoomTypeText.trim();
    setRoomTypes([...roomTypes, addedType]);
    setNewRoomTypeText('');
    setModalError(null);
    setIsAddRoomTypeModalVisible(false);
    setStatusNotice(`"${addedType}" added to room types.`);
  };

  const handleDeleteRoomType = (roomType: string) => {
    if (roomTypes.length <= 1) {
      setStatusNotice('You must have at least one room type configured.');
      return;
    }
    setConfirmDialog({
      title: 'Delete Room Type',
      message: `Are you sure you want to remove "${roomType}"? Existing rooms of this type will remain in your records.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setRoomTypes(roomTypes.filter((t) => t !== roomType));
        setStatusNotice(`"${roomType}" removed from room types.`);
        setConfirmDialog(null);
      },
    });
  };

  const handleAddReason = () => {
    if (!newReasonText.trim()) {
      setModalError('Please enter a maintenance reason (e.g. Pest Control).');
      return;
    }
    if (maintenanceReasons.some((r) => r.toLowerCase() === newReasonText.trim().toLowerCase())) {
      setModalError('This maintenance reason is already in your list.');
      return;
    }
    const addedReason = newReasonText.trim();
    setMaintenanceReasons([...maintenanceReasons, addedReason]);
    setNewReasonText('');
    setModalError(null);
    setIsAddReasonModalVisible(false);
    setStatusNotice(`"${addedReason}" added to maintenance reasons.`);
  };

  const handleDeleteReason = (reason: string) => {
    setConfirmDialog({
      title: 'Delete Reason',
      message: `Are you sure you want to remove "${reason}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setMaintenanceReasons(maintenanceReasons.filter((r) => r !== reason));
        setStatusNotice(`"${reason}" removed.`);
        setConfirmDialog(null);
      },
    });
  };

  const handleCreateRoom = () => {
    const floorIdx = Math.max(
      0,
      floors.findIndex((f) => matchesFloorName(f, newRoomFloor))
    );
    const rawNum =
      newRoomNumber.trim() || getDefaultNextRoomNumber(newRoomFloor, rooms, floorIdx);
    const formattedRoomNumber = /^room\s+/i.test(rawNum)
      ? `Room ${rawNum.replace(/^room\s+/i, '').trim()}`
      : `Room ${rawNum}`;

    if (
      rooms.some(
        (r) =>
          matchesFloorName(getRoomFloor(r), newRoomFloor) &&
          r.roomNumber.trim().toLowerCase() === formattedRoomNumber.toLowerCase()
      )
    ) {
      setModalError(`${formattedRoomNumber} already exists on ${newRoomFloor}.`);
      return;
    }

    const typeSelected = newType.trim() || roomTypes[0] || '1 BHK';
    const defaults = getDefaultFinancialsForType(typeSelected);
    const rentFormatted = newRent.trim()
      ? newRent.trim().startsWith('₹')
        ? newRent.trim()
        : `₹${newRent.trim()}`
      : defaults.rent;
    const depositFormatted = newDeposit.trim()
      ? newDeposit.trim().startsWith('₹')
        ? newDeposit.trim()
        : `₹${newDeposit.trim()}`
      : defaults.deposit;

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

    const cleanWingSuffix = newWingSuffix.trim();
    const newRoom: RoomItem = {
      id: Date.now().toString(),
      roomNumber: formattedRoomNumber,
      floor: newRoomFloor,
      wing: cleanWingSuffix ? `${newRoomFloor} · ${cleanWingSuffix}` : newRoomFloor,
      type: typeSelected,
      monthlyRent: rentFormatted,
      depositAmount: depositFormatted,
      status: newStatus,
      joinedDate: newStatus !== 'Vacant' ? 'Nov 02, 2026' : undefined,
      members,
    };

    appendRooms([newRoom]);
    setNewRoomNumber('');
    setNewWingSuffix('');
    setNewTenant('');
    setNewTenantPhone('');
    setNewRent('');
    setNewDeposit('');
    setIsRoomFloorDropdownOpen(false);
    setIsRoomTypeDropdownOpen(false);
    setModalError(null);
    setIsAddRoomModalVisible(false);
    setStatusNotice(`${newRoom.roomNumber} (${newRoom.type}) added to ${newRoomFloor}.`);
  };

  const handleSaveSettings = () => {
    setStatusNotice('Rental preferences updated.');
  };

  const sortedSettingsRooms = React.useMemo(
    () => [...rooms].sort(sortRoomNumbers),
    [rooms]
  );

  const selectedFloorCountInModal = rooms.filter((r) =>
    matchesFloorName(getRoomFloor(r), newRoomFloor)
  ).length;
  const selectedFloorIdxInModal = Math.max(
    0,
    floors.findIndex((f) => matchesFloorName(f, newRoomFloor))
  );
  const suggestedRoomNumInModal = getDefaultNextRoomNumber(
    newRoomFloor,
    rooms,
    selectedFloorIdxInModal
  );

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
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

          {statusNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeBannerText}>{statusNotice}</Text>
              <TouchableOpacity onPress={() => setStatusNotice(null)}>
                <Text style={styles.noticeDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Section: Floors Management */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>FLOORS ({floors.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={handleOpenAddFloorModal}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Floor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.apartmentsCard}>
            {floors.map((floorName, idx) => {
              const isLast = idx === floors.length - 1;
              const floorRooms = rooms.filter((r) =>
                matchesFloorName(getRoomFloor(r), floorName)
              );
              const nextDefaultRoom = getDefaultNextRoomNumber(floorName, rooms, idx);

              return (
                <React.Fragment key={floorName}>
                  <View style={styles.apartmentItemRow}>
                    <View style={styles.aptIconCircle}>
                      <Feather name="layers" size={Typography.iconSize.base} color={Palette.accentText} />
                    </View>

                    <View style={styles.aptDetailsCol}>
                      <Text style={styles.aptNameText}>{floorName}</Text>
                      <Text style={styles.aptSubText}>
                        {floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'} · Next default: {nextDefaultRoom}
                      </Text>
                    </View>

                    {floors.length > 1 && (
                      <TouchableOpacity
                        style={styles.deleteAptBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleDeleteFloor(floorName)}
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

          {/* Section: Room Types Management */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ROOM TYPES ({roomTypes.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={() => {
                setModalError(null);
                setIsAddRoomTypeModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Room Type</Text>
            </TouchableOpacity>
          </View>

          {/* Room Types Cards List */}
          <View style={styles.apartmentsCard}>
            {roomTypes.map((type, idx) => {
              const isLast = idx === roomTypes.length - 1;
              const countForType = rooms.filter(
                (r) =>
                  r.type.toLowerCase().trim() === type.toLowerCase().trim() ||
                  r.type.toLowerCase().includes(type.toLowerCase())
              ).length;

              return (
                <React.Fragment key={type}>
                  <View style={styles.apartmentItemRow}>
                    <View style={styles.aptIconCircle}>
                      <MaterialCommunityIcons name="floor-plan" size={20} color={Palette.accentText} />
                    </View>

                    <View style={styles.aptDetailsCol}>
                      <Text style={styles.aptNameText}>{type}</Text>
                      <Text style={styles.aptSubText}>
                        {countForType} {countForType === 1 ? 'room' : 'rooms'} configured
                      </Text>
                    </View>

                    {roomTypes.length > 1 && (
                      <TouchableOpacity
                        style={styles.deleteAptBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleDeleteRoomType(type)}
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

          {/* Section: Rooms Management (Add rooms here to show in Rooms page) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ROOMS LIST ({rooms.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={handleOpenAddRoomModal}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Room</Text>
            </TouchableOpacity>
          </View>

          {/* Rooms Cards List in Settings */}
          <View style={styles.apartmentsCard}>
            {sortedSettingsRooms.map((rm, idx) => {
              const isLast = idx === sortedSettingsRooms.length - 1;
              const isOccupied = rm.status === 'Occupied';
              const isRentDue = rm.status === 'Rent due';
              const isVacant = rm.status === 'Vacant';
              return (
                <React.Fragment key={rm.id}>
                  <View style={styles.apartmentItemRow}>
                    <View style={styles.aptIconCircle}>
                      <MaterialCommunityIcons name="door-open" size={20} color={Palette.accentText} />
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
                      <Text style={styles.aptSubText}>
                        {getRoomFloor(rm)} · {rm.type}
                      </Text>
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
              onPress={() => {
                setModalError(null);
                setIsAddReasonModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
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
                      <Feather name="tool" size={Typography.iconSize.base} color={Palette.accentText} />
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
        </View>
      </ScrollView>

      {/* Add Floor Modal */}
      <Modal
        visible={isAddFloorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddFloorModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddFloorModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Floor</Text>
              <TouchableOpacity onPress={() => setIsAddFloorModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Floor Name / Number *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Floor 4, Ground Floor"
                placeholderTextColor={Palette.textMuted}
                value={newFloorName}
                onChangeText={(txt) => {
                  setNewFloorName(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <Text style={styles.inputLabel}>Initial Rooms on Floor (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 3 (auto-sets Room 401, 402...)"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newFloorRoomsCount}
                onChangeText={(txt) => {
                  setNewFloorRoomsCount(txt);
                  if (modalError) setModalError(null);
                }}
              />

              {(parseInt(newFloorRoomsCount.trim(), 10) || 0) > 0 && (
                <>
                  <Text style={styles.inputLabel}>Default Room Type</Text>
                  <View style={styles.chipsWrap}>
                    {roomTypes.map((type) => {
                      const active = newFloorDefaultType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.typeChip, active && styles.typeChipActive]}
                          onPress={() => setNewFloorDefaultType(type)}
                        >
                          <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Rent (₹)</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="e.g. 9500"
                        placeholderTextColor={Palette.textMuted}
                        keyboardType="numeric"
                        value={newFloorRent}
                        onChangeText={setNewFloorRent}
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Deposit (₹)</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="e.g. 19000"
                        placeholderTextColor={Palette.textMuted}
                        keyboardType="numeric"
                        value={newFloorDeposit}
                        onChangeText={setNewFloorDeposit}
                      />
                    </View>
                  </View>
                </>
              )}

              {(() => {
                const formatted = formatFloorLabel(newFloorName) || 'New Floor';
                const parsedCount = newFloorRoomsCount.trim()
                  ? parseInt(newFloorRoomsCount.trim(), 10)
                  : 0;
                const safeCount =
                  !Number.isNaN(parsedCount) && parsedCount > 0
                    ? Math.min(parsedCount, 50)
                    : 0;
                const previewRooms: string[] = [];
                if (safeCount > 0) {
                  const tempRooms = [...rooms];
                  for (let i = 0; i < Math.min(safeCount, 4); i++) {
                    const num = getDefaultNextRoomNumber(formatted, tempRooms, floors.length);
                    previewRooms.push(num);
                    tempRooms.push({
                      id: `preview-${i}`,
                      roomNumber: num,
                      floor: formatted,
                      wing: formatted,
                      type: newFloorDefaultType,
                      monthlyRent: '₹9,000',
                      depositAmount: '₹18,000',
                      status: 'Vacant',
                      members: [],
                    });
                  }
                }
                const nextSingle = getDefaultNextRoomNumber(formatted, rooms, floors.length);
                return (
                  <View style={styles.floorPreviewBox}>
                    <Feather name="info" size={Typography.iconSize.sm} color={Palette.accentText} />
                    <Text style={styles.floorPreviewText}>
                      {safeCount > 0
                        ? `Will create ${safeCount} vacant rooms: ${previewRooms.join(', ')}${safeCount > 4 ? '...' : ''}`
                        : `First default room on ${formatted}: ${nextSingle}`}
                    </Text>
                  </View>
                );
              })()}

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleAddFloor}
              >
                <Text style={styles.saveAptBtnText}>Save Floor</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Room Modal (Auto-sets default room number based on selected floor) */}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Floor *</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setIsRoomFloorDropdownOpen((prev) => !prev);
                  setIsRoomTypeDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownSelectorText}>{newRoomFloor}</Text>
                <Feather
                  name={isRoomFloorDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={Typography.iconSize.base}
                  color={Palette.accentText}
                />
              </TouchableOpacity>

              {isRoomFloorDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {floors.map((floorName) => {
                      const isSelected = matchesFloorName(newRoomFloor, floorName);
                      return (
                        <TouchableOpacity
                          key={floorName}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => handleSelectRoomFloorInModal(floorName)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {floorName}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={Typography.iconSize.sm} color={Palette.accentText} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Room Number (Default Based on Floor) *</Text>
              <TextInput
                style={styles.inputField}
                placeholder={suggestedRoomNumInModal}
                placeholderTextColor={Palette.textMuted}
                value={newRoomNumber}
                onChangeText={(txt) => {
                  setNewRoomNumber(txt);
                  if (modalError) setModalError(null);
                }}
              />
              <Text style={styles.fieldHintText}>
                Default for {newRoomFloor} ({selectedFloorCountInModal} existing rooms): {suggestedRoomNumInModal}
              </Text>

              <Text style={styles.inputLabel}>Wing (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. East Wing, North Wing"
                placeholderTextColor={Palette.textMuted}
                value={newWingSuffix}
                onChangeText={setNewWingSuffix}
              />

              <Text style={styles.inputLabel}>Room Type</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => {
                  setIsRoomTypeDropdownOpen((prev) => !prev);
                  setIsRoomFloorDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownSelectorText}>
                  {newType || roomTypes[0] || 'Select Room Type'}
                </Text>
                <Feather
                  name={isRoomTypeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={Typography.iconSize.base}
                  color={Palette.accentText}
                />
              </TouchableOpacity>

              {isRoomTypeDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {roomTypes.map((type) => {
                      const isSelected = (newType || roomTypes[0]) === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => {
                            setNewType(type);
                            setIsRoomTypeDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {type}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={Typography.iconSize.sm} color={Palette.accentText} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

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
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Reason / Issue Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Pest Control, Window repair"
                placeholderTextColor={Palette.textMuted}
                value={newReasonText}
                onChangeText={(txt) => {
                  setNewReasonText(txt);
                  if (modalError) setModalError(null);
                }}
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

      {/* Add Room Type Modal */}
      <Modal
        visible={isAddRoomTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddRoomTypeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddRoomTypeModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Room Type</Text>
              <TouchableOpacity onPress={() => setIsAddRoomTypeModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Room Type Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 4 BHK, Penthouse, Duplex"
                placeholderTextColor={Palette.textMuted}
                value={newRoomTypeText}
                onChangeText={(txt) => {
                  setNewRoomTypeText(txt);
                  if (modalError) setModalError(null);
                }}
                autoFocus
              />

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleAddRoomType}
              >
                <Text style={styles.saveAptBtnText}>Save Room Type</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cross-platform Confirmation Modal */}
      <Modal
        visible={confirmDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDialog(null)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBackdrop} />
          {confirmDialog ? (
            <View style={styles.confirmModalCard}>
              <Text style={styles.confirmModalTitle}>{confirmDialog.title}</Text>
              <Text style={styles.confirmModalMessage}>{confirmDialog.message}</Text>
              <View style={styles.confirmModalActions}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setConfirmDialog(null)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDangerBtn}
                  onPress={confirmDialog.onConfirm}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmDangerText}>{confirmDialog.confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
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
    paddingTop: 10,
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
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
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
    borderRadius: 5,
  },
  saveHeaderButtonText: {
    color: Palette.onPrimary,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  noticeBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  noticeDismissText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.accentText,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
  },
  addAptButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAptButtonText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
  },
  apartmentsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
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
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
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
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  aptSubText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  aptRoomsText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
  },
  deleteAptBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
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
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
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
    backgroundColor: Palette.backdrop,
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  modalErrorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  modalErrorText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.status.overdue.text,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
  },
  fieldHintText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.accentText,
    fontWeight: '600',
    marginTop: 5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  typeChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  typeChipText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.text,
  },
  typeChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  floorPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  floorPreviewText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.accentText,
  },
  saveAptBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveAptBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  roomStatusTag: {
    fontSize: Typography.fontSize.caption,
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
    borderRadius: 5,
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
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  statusSelectTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  dropdownSelector: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownSelectorText: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '500',
  },
  dropdownMenu: {
    marginTop: 2,
    marginBottom: 8,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: Palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 140,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  dropdownItemSelected: {
    backgroundColor: Palette.background,
  },
  dropdownItemText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: Palette.accentText,
    fontWeight: '700',
  },
  centerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  confirmModalMessage: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    marginBottom: 18,
    lineHeight: Typography.lineHeight.sm,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  confirmDangerBtn: {
    flex: 1,
    backgroundColor: Palette.status.overdue.text,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmDangerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});
