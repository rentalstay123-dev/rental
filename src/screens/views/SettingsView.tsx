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
  DEFAULT_ROOM_TYPE_FINANCIALS,
  INITIAL_MAINTENANCE_REASONS,
  INITIAL_ROOM_TYPES,
} from '../../constants/initialData';
import { useAppData } from '../../context/AppDataContext';
import type { RoomTypeDefaultFinancials } from '../../types/appData';
import { formatRupeeAmount, formatShortDate, parseRupeeAmount } from '../../utils/finance';
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

export { INITIAL_MAINTENANCE_REASONS, INITIAL_ROOM_TYPES };

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

const RENT_CYCLE_PRESETS = ['1st of month', '5th of month', '10th of month', '15th of month'];
const GRACE_PERIOD_PRESETS = ['3 days', '5 days', '7 days', '10 days'];

const getFallbackFinancialsForType = (type: string): RoomTypeDefaultFinancials => {
  const exact = DEFAULT_ROOM_TYPE_FINANCIALS[type];
  if (exact) return exact;
  const key = type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key.includes('3bhk')) return DEFAULT_ROOM_TYPE_FINANCIALS['3 BHK'];
  if (key.includes('2bhk')) return DEFAULT_ROOM_TYPE_FINANCIALS['2 BHK'];
  if (key.includes('studio') || key.includes('1rk')) return DEFAULT_ROOM_TYPE_FINANCIALS['Studio / 1 RK'];
  if (key.includes('1bhk')) return DEFAULT_ROOM_TYPE_FINANCIALS['1 BHK'];
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

const normalizeRoomNumberInput = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^room\s+/i.test(trimmed)
    ? `Room ${trimmed.replace(/^room\s+/i, '').trim()}`
    : `Room ${trimmed}`;
};

export default function SettingsView({
  rooms: propRooms,
  onAddRoom,
  onAddRooms,
  onBack,
  maintenanceReasons: propMaintenanceReasons,
  setMaintenanceReasons: propSetMaintenanceReasons,
  roomTypes: propRoomTypes,
  floors: propFloors,
  setFloors: propSetFloors,
}: SettingsViewProps) {
  const {
    rooms: ctxRooms,
    setRoomsList,
    upsertSingleRoom,
    removeRoom,
    settings: ctxSettings,
    updateSettings,
    clearAllWorkspaceData,
    restoreSampleWorkspaceData,
    refreshWorkspace,
  } = useAppData();

  const rooms = propRooms ?? ctxRooms ?? INITIAL_ROOMS;
  const maintenanceReasons = propMaintenanceReasons ?? ctxSettings.maintenanceReasons ?? INITIAL_MAINTENANCE_REASONS;
  const setMaintenanceReasons = propSetMaintenanceReasons ?? ((updater: React.SetStateAction<string[]>) => {
    const next = typeof updater === 'function' ? updater(maintenanceReasons) : updater;
    void updateSettings({ maintenanceReasons: next });
  });
  const roomTypes = propRoomTypes ?? ctxSettings.roomTypes ?? INITIAL_ROOM_TYPES;
  const floors = propFloors ?? ctxSettings.floors ?? INITIAL_FLOORS;
  const setFloors = propSetFloors ?? ((updater: React.SetStateAction<string[]>) => {
    const next = typeof updater === 'function' ? updater(floors) : updater;
    void updateSettings({ floors: next });
  });

  const roomTypeDefaults = ctxSettings.roomTypeDefaults ?? DEFAULT_ROOM_TYPE_FINANCIALS;

  const getDefaultsForType = (type: string): RoomTypeDefaultFinancials =>
    roomTypeDefaults[type] ?? getFallbackFinancialsForType(type);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const [draftRentCycleDay, setDraftRentCycleDay] = useState<string | null>(null);
  const [draftGracePeriod, setDraftGracePeriod] = useState<string | null>(null);
  const [draftLateFee, setDraftLateFee] = useState<string | null>(null);

  const rentCycleDay = draftRentCycleDay ?? ctxSettings.rentCycleDay;
  const gracePeriod = draftGracePeriod ?? ctxSettings.gracePeriod;
  const lateFee = draftLateFee ?? ctxSettings.lateFee;
  const autoReminder = ctxSettings.autoReminder;
  const maintenanceNotify = ctxSettings.maintenanceNotify;
  const hasUnsavedRuleEdits =
    draftRentCycleDay !== null || draftGracePeriod !== null || draftLateFee !== null;

  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Add / Rename Floor Modal State
  const [isFloorModalVisible, setIsFloorModalVisible] = useState(false);
  const [editingFloorOriginal, setEditingFloorOriginal] = useState<string | null>(null);
  const [floorNameInput, setFloorNameInput] = useState('');
  const [newFloorRoomsCount, setNewFloorRoomsCount] = useState('');
  const [newFloorDefaultType, setNewFloorDefaultType] = useState(roomTypes[0] || '1 BHK');
  const [newFloorRent, setNewFloorRent] = useState('');
  const [newFloorDeposit, setNewFloorDeposit] = useState('');

  // Add / Edit Unit Modal State
  const [isRoomModalVisible, setIsRoomModalVisible] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
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
  const [newStatus, setNewStatus] = useState<'Occupied' | 'Rent due' | 'Vacant'>('Vacant');

  // Add / Edit Room Type Modal State
  const [isRoomTypeModalVisible, setIsRoomTypeModalVisible] = useState(false);
  const [editingRoomTypeOriginal, setEditingRoomTypeOriginal] = useState<string | null>(null);
  const [roomTypeNameInput, setRoomTypeNameInput] = useState('');
  const [roomTypeDefaultRentInput, setRoomTypeDefaultRentInput] = useState('');
  const [roomTypeDefaultDepositInput, setRoomTypeDefaultDepositInput] = useState('');

  // Add / Edit Maintenance Reason Modal State
  const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
  const [editingReasonOriginal, setEditingReasonOriginal] = useState<string | null>(null);
  const [reasonNameInput, setReasonNameInput] = useState('');

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
      setRoomsList((prev) => [...prev, ...created]);
    }
  };

  // --- FLOOR HANDLERS ---
  const handleOpenAddFloorModal = () => {
    const numericFloors = floors
      .map((fl) => extractFloorNumber(fl))
      .filter((n): n is number => n !== null);
    const nextFloorNum = numericFloors.length > 0 ? Math.max(...numericFloors) + 1 : floors.length + 1;
    const defaultType = roomTypes[0] || '1 BHK';
    const typeDefaults = getDefaultsForType(defaultType);

    setEditingFloorOriginal(null);
    setFloorNameInput(`Floor ${nextFloorNum}`);
    setNewFloorRoomsCount('');
    setNewFloorDefaultType(defaultType);
    setNewFloorRent(String(parseRupeeAmount(typeDefaults.rent)));
    setNewFloorDeposit(String(parseRupeeAmount(typeDefaults.deposit)));
    setModalError(null);
    setIsFloorModalVisible(true);
  };

  const handleOpenEditFloorModal = (floorName: string) => {
    setEditingFloorOriginal(floorName);
    setFloorNameInput(floorName);
    setNewFloorRoomsCount('');
    setModalError(null);
    setIsFloorModalVisible(true);
  };

  const handleSaveFloor = () => {
    const formatted = formatFloorLabel(floorNameInput);
    if (!formatted) {
      setModalError('Please enter a floor name or number (e.g. Floor 4).');
      return;
    }

    if (editingFloorOriginal) {
      if (
        !matchesFloorName(editingFloorOriginal, formatted) &&
        floors.some((fl) => matchesFloorName(fl, formatted))
      ) {
        setModalError(`${formatted} is already in your floors list.`);
        return;
      }

      const updatedFloors = sortFloorsList(
        floors.map((fl) => (matchesFloorName(fl, editingFloorOriginal) ? formatted : fl))
      );
      setFloors(updatedFloors);

      // Update floor & wing prefix on any matching rooms
      setRoomsList((prev) =>
        prev.map((rm) => {
          if (!matchesFloorName(getRoomFloor(rm), editingFloorOriginal)) return rm;
          const wingParts = rm.wing.split('·').map((s) => s.trim());
          const updatedWing =
            wingParts.length > 1 ? `${formatted} · ${wingParts.slice(1).join(' · ')}` : formatted;
          return { ...rm, floor: formatted, wing: updatedWing };
        })
      );

      setIsFloorModalVisible(false);
      setStatusNotice(`Updated "${editingFloorOriginal}" to "${formatted}".`);
      return;
    }

    if (floors.some((fl) => matchesFloorName(fl, formatted))) {
      setModalError(`${formatted} is already in your floors list.`);
      return;
    }

    const parsedCount = newFloorRoomsCount.trim() ? parseInt(newFloorRoomsCount.trim(), 10) : 0;
    if (newFloorRoomsCount.trim() && (Number.isNaN(parsedCount) || parsedCount < 0)) {
      setModalError('Please enter a valid number of units.');
      return;
    }
    if (parsedCount > 50) {
      setModalError('You can auto-create up to 50 units per floor at once.');
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
      const typeChosen = newFloorDefaultType || roomTypes[0] || '1 BHK';
      const defaults = getDefaultsForType(typeChosen);
      const parsedRent = parseRupeeAmount(newFloorRent);
      const parsedDeposit = parseRupeeAmount(newFloorDeposit);
      const rentFormatted = parsedRent > 0 ? formatRupeeAmount(parsedRent) : defaults.rent;
      const depositFormatted =
        parsedDeposit > 0 ? formatRupeeAmount(parsedDeposit) : defaults.deposit;

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
          type: typeChosen,
          monthlyRent: rentFormatted,
          depositAmount: depositFormatted,
          status: 'Vacant',
          members: [],
        });
      }
      appendRooms(createdRooms);
    }

    setFloorNameInput('');
    setNewFloorRoomsCount('');
    setModalError(null);
    setIsFloorModalVisible(false);
    setStatusNotice(
      createdRooms.length > 0
        ? `Added ${formatted} with ${createdRooms.length} ${createdRooms.length === 1 ? 'unit' : 'units'} (${createdRooms[0].roomNumber}${
            createdRooms.length > 1
              ? ` to ${createdRooms[createdRooms.length - 1].roomNumber}`
              : ''
          }).`
        : `Added ${formatted}. First unit will default to ${getDefaultNextRoomNumber(
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
          ? `Remove "${floorName}" from Settings? ${assignedRoomsCount} existing ${assignedRoomsCount === 1 ? 'unit' : 'units'} on this floor will remain until deleted.`
          : `Are you sure you want to remove "${floorName}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setFloors(floors.filter((f) => !matchesFloorName(f, floorName)));
        setStatusNotice(`"${floorName}" removed from configured floors.`);
        setConfirmDialog(null);
      },
    });
  };

  // --- ROOM TYPE HANDLERS ---
  const handleOpenAddRoomTypeModal = () => {
    setEditingRoomTypeOriginal(null);
    setRoomTypeNameInput('');
    setRoomTypeDefaultRentInput('9500');
    setRoomTypeDefaultDepositInput('19000');
    setModalError(null);
    setIsRoomTypeModalVisible(true);
  };

  const handleOpenEditRoomTypeModal = (type: string) => {
    const existingDefaults = getDefaultsForType(type);
    setEditingRoomTypeOriginal(type);
    setRoomTypeNameInput(type);
    setRoomTypeDefaultRentInput(String(parseRupeeAmount(existingDefaults.rent)));
    setRoomTypeDefaultDepositInput(String(parseRupeeAmount(existingDefaults.deposit)));
    setModalError(null);
    setIsRoomTypeModalVisible(true);
  };

  const handleSaveRoomType = () => {
    const cleanName = roomTypeNameInput.trim();
    if (!cleanName) {
      setModalError('Please enter a room type (e.g. 4 BHK, Studio, Penthouse).');
      return;
    }

    const rentNum = parseRupeeAmount(roomTypeDefaultRentInput);
    const depNum = parseRupeeAmount(roomTypeDefaultDepositInput);
    const nextDefaultsEntry: RoomTypeDefaultFinancials = {
      rent: formatRupeeAmount(rentNum > 0 ? rentNum : 9000),
      deposit: formatRupeeAmount(depNum > 0 ? depNum : (rentNum > 0 ? rentNum * 2 : 18000)),
    };

    if (editingRoomTypeOriginal) {
      const duplicate = roomTypes.some(
        (t) =>
          t.toLowerCase() === cleanName.toLowerCase() &&
          t.toLowerCase() !== editingRoomTypeOriginal.toLowerCase()
      );
      if (duplicate) {
        setModalError('This room type is already in your list.');
        return;
      }

      const nextTypes = roomTypes.map((t) => (t === editingRoomTypeOriginal ? cleanName : t));
      const nextDefaultsMap = { ...roomTypeDefaults };
      if (editingRoomTypeOriginal !== cleanName) {
        delete nextDefaultsMap[editingRoomTypeOriginal];
      }
      nextDefaultsMap[cleanName] = nextDefaultsEntry;

      void updateSettings({
        roomTypes: nextTypes,
        roomTypeDefaults: nextDefaultsMap,
      });

      if (editingRoomTypeOriginal !== cleanName) {
        setRoomsList((prev) =>
          prev.map((rm) =>
            rm.type.toLowerCase().trim() === editingRoomTypeOriginal.toLowerCase().trim()
              ? { ...rm, type: cleanName }
              : rm
          )
        );
      }

      setModalError(null);
      setIsRoomTypeModalVisible(false);
      setStatusNotice(`Updated "${cleanName}" defaults (${nextDefaultsEntry.rent} / ${nextDefaultsEntry.deposit}).`);
      return;
    }

    if (roomTypes.some((t) => t.toLowerCase() === cleanName.toLowerCase())) {
      setModalError('This room type is already in your list.');
      return;
    }

    const nextTypes = [...roomTypes, cleanName];
    const nextDefaultsMap = {
      ...roomTypeDefaults,
      [cleanName]: nextDefaultsEntry,
    };

    void updateSettings({
      roomTypes: nextTypes,
      roomTypeDefaults: nextDefaultsMap,
    });
    setRoomTypeNameInput('');
    setModalError(null);
    setIsRoomTypeModalVisible(false);
    setStatusNotice(`"${cleanName}" added to room types.`);
  };

  const handleDeleteRoomType = (roomType: string) => {
    if (roomTypes.length <= 1) {
      setStatusNotice('You must have at least one room type configured.');
      return;
    }
    setConfirmDialog({
      title: 'Delete Room Type',
      message: `Are you sure you want to remove "${roomType}"? Existing units of this type will remain in your records.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        const nextTypes = roomTypes.filter((t) => t !== roomType);
        const nextDefaultsMap = { ...roomTypeDefaults };
        delete nextDefaultsMap[roomType];
        void updateSettings({
          roomTypes: nextTypes,
          roomTypeDefaults: nextDefaultsMap,
        });
        setStatusNotice(`"${roomType}" removed from room types.`);
        setConfirmDialog(null);
      },
    });
  };

  // --- MAINTENANCE REASON HANDLERS ---
  const handleOpenAddReasonModal = () => {
    setEditingReasonOriginal(null);
    setReasonNameInput('');
    setModalError(null);
    setIsReasonModalVisible(true);
  };

  const handleOpenEditReasonModal = (reason: string) => {
    setEditingReasonOriginal(reason);
    setReasonNameInput(reason);
    setModalError(null);
    setIsReasonModalVisible(true);
  };

  const handleSaveReason = () => {
    const cleanReason = reasonNameInput.trim();
    if (!cleanReason) {
      setModalError('Please enter a maintenance reason (e.g. Pest Control).');
      return;
    }

    if (editingReasonOriginal) {
      const duplicate = maintenanceReasons.some(
        (r) =>
          r.toLowerCase() === cleanReason.toLowerCase() &&
          r.toLowerCase() !== editingReasonOriginal.toLowerCase()
      );
      if (duplicate) {
        setModalError('This maintenance reason is already in your list.');
        return;
      }
      setMaintenanceReasons(
        maintenanceReasons.map((r) => (r === editingReasonOriginal ? cleanReason : r))
      );
      setModalError(null);
      setIsReasonModalVisible(false);
      setStatusNotice(`Updated "${editingReasonOriginal}" to "${cleanReason}".`);
      return;
    }

    if (maintenanceReasons.some((r) => r.toLowerCase() === cleanReason.toLowerCase())) {
      setModalError('This maintenance reason is already in your list.');
      return;
    }
    setMaintenanceReasons([...maintenanceReasons, cleanReason]);
    setReasonNameInput('');
    setModalError(null);
    setIsReasonModalVisible(false);
    setStatusNotice(`"${cleanReason}" added to maintenance reasons.`);
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

  // --- UNIT / ROOM HANDLERS ---
  const handleOpenAddRoomModal = () => {
    const defaultFloor = floors[0] || 'Floor 1';
    const floorIdx = Math.max(0, floors.indexOf(defaultFloor));
    const defaultRoomNo = getDefaultNextRoomNumber(defaultFloor, rooms, floorIdx);
    const defaultType = roomTypes[0] || '1 BHK';
    const typeDefaults = getDefaultsForType(defaultType);

    setEditingRoomId(null);
    setNewRoomFloor(defaultFloor);
    setNewRoomNumber(defaultRoomNo);
    setNewWingSuffix('');
    setNewType(defaultType);
    setNewStatus('Vacant');
    setNewTenant('');
    setNewTenantPhone('');
    setNewRent(String(parseRupeeAmount(typeDefaults.rent)));
    setNewDeposit(String(parseRupeeAmount(typeDefaults.deposit)));
    setIsRoomFloorDropdownOpen(false);
    setIsRoomTypeDropdownOpen(false);
    setModalError(null);
    setIsRoomModalVisible(true);
  };

  const handleOpenEditRoomModal = (room: RoomItem) => {
    const roomFloor = getRoomFloor(room);
    const wingParts = room.wing.split('·').map((s) => s.trim());
    const wingSuffix = wingParts.length > 1 ? wingParts.slice(1).join(' · ') : '';
    const primary = room.members[0];

    setEditingRoomId(room.id);
    setNewRoomFloor(roomFloor);
    setNewRoomNumber(room.roomNumber);
    setNewWingSuffix(wingSuffix);
    setNewType(room.type);
    setNewStatus(room.status);
    setNewTenant(primary?.name ?? '');
    setNewTenantPhone(primary?.phone ?? '');
    setNewRent(String(parseRupeeAmount(room.monthlyRent)));
    setNewDeposit(String(parseRupeeAmount(room.depositAmount)));
    setIsRoomFloorDropdownOpen(false);
    setIsRoomTypeDropdownOpen(false);
    setModalError(null);
    setIsRoomModalVisible(true);
  };

  const handleSelectRoomFloorInModal = (floorName: string) => {
    const floorIdx = Math.max(
      0,
      floors.findIndex((f) => matchesFloorName(f, floorName))
    );
    setNewRoomFloor(floorName);
    if (!editingRoomId) {
      setNewRoomNumber(getDefaultNextRoomNumber(floorName, rooms, floorIdx));
    }
    setIsRoomFloorDropdownOpen(false);
    if (modalError) setModalError(null);
  };

  const handleSelectRoomTypeInModal = (type: string) => {
    setNewType(type);
    const defaults = getDefaultsForType(type);
    setNewRent(String(parseRupeeAmount(defaults.rent)));
    setNewDeposit(String(parseRupeeAmount(defaults.deposit)));
    setIsRoomTypeDropdownOpen(false);
  };

  const handleSaveRoom = () => {
    const floorIdx = Math.max(
      0,
      floors.findIndex((f) => matchesFloorName(f, newRoomFloor))
    );
    const rawNum =
      newRoomNumber.trim() || getDefaultNextRoomNumber(newRoomFloor, rooms, floorIdx);
    const formattedRoomNumber = normalizeRoomNumberInput(rawNum);

    if (
      rooms.some(
        (r) =>
          r.id !== editingRoomId &&
          matchesFloorName(getRoomFloor(r), newRoomFloor) &&
          r.roomNumber.trim().toLowerCase() === formattedRoomNumber.toLowerCase()
      )
    ) {
      setModalError(`${formattedRoomNumber} already exists on ${newRoomFloor}.`);
      return;
    }

    if (newStatus !== 'Vacant' && !newTenant.trim()) {
      setModalError('Please enter a primary resident name for an occupied unit.');
      return;
    }

    const typeSelected = newType.trim() || roomTypes[0] || '1 BHK';
    const defaults = getDefaultsForType(typeSelected);
    const rentNum = parseRupeeAmount(newRent);
    const depositNum = parseRupeeAmount(newDeposit);
    const rentFormatted = rentNum > 0 ? formatRupeeAmount(rentNum) : defaults.rent;
    const depositFormatted = depositNum > 0 ? formatRupeeAmount(depositNum) : defaults.deposit;
    const cleanWingSuffix = newWingSuffix.trim();
    const wingLabel = cleanWingSuffix ? `${newRoomFloor} · ${cleanWingSuffix}` : newRoomFloor;

    if (editingRoomId) {
      const existing = rooms.find((r) => r.id === editingRoomId);
      if (!existing) return;

      let updatedMembers = existing.members;
      if (newStatus === 'Vacant') {
        updatedMembers = [];
      } else if (existing.members.length > 0) {
        updatedMembers = existing.members.map((m, i) =>
          i === 0
            ? {
                ...m,
                name: newTenant.trim(),
                phone: newTenantPhone.trim() || m.phone,
              }
            : m
        );
      } else {
        updatedMembers = [
          {
            id: `${Date.now()}`,
            name: newTenant.trim(),
            role: 'Primary Resident',
            phone: newTenantPhone.trim() || '+91 98000 00000',
          },
        ];
      }

      const updatedRoom: RoomItem = {
        ...existing,
        roomNumber: formattedRoomNumber,
        floor: newRoomFloor,
        wing: wingLabel,
        type: typeSelected,
        monthlyRent: rentFormatted,
        depositAmount: depositFormatted,
        status: newStatus,
        joinedDate:
          newStatus === 'Vacant' ? undefined : existing.joinedDate || formatShortDate(),
        bookingType: newStatus === 'Vacant' ? undefined : existing.bookingType || 'Family',
        members: updatedMembers,
      };

      void upsertSingleRoom(updatedRoom);
      setIsRoomModalVisible(false);
      setModalError(null);
      setStatusNotice(`Updated ${updatedRoom.roomNumber} (${updatedRoom.type}).`);
      return;
    }

    const members: RoomMember[] =
      newStatus === 'Vacant'
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
      roomNumber: formattedRoomNumber,
      floor: newRoomFloor,
      wing: wingLabel,
      type: typeSelected,
      monthlyRent: rentFormatted,
      depositAmount: depositFormatted,
      status: newStatus,
      joinedDate: newStatus !== 'Vacant' ? formatShortDate() : undefined,
      bookingType: newStatus !== 'Vacant' ? 'Family' : undefined,
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
    setIsRoomModalVisible(false);
    setStatusNotice(`${newRoom.roomNumber} (${newRoom.type}) added to ${newRoomFloor}.`);
  };

  const handleDeleteRoom = (room: RoomItem) => {
    setConfirmDialog({
      title: 'Delete Unit',
      message: `Delete ${room.roomNumber} (${getRoomFloor(room)})? Its rent and deposit records will also be removed.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        void removeRoom(room);
        setStatusNotice(`${room.roomNumber} deleted.`);
        setConfirmDialog(null);
      },
    });
  };

  // --- RENT COLLECTION RULES HANDLER ---
  const handleSaveSettings = () => {
    const parsedLateFee = parseRupeeAmount(lateFee);
    const formattedLateFee =
      parsedLateFee > 0 ? formatRupeeAmount(parsedLateFee) : lateFee.trim() || '₹500';

    void updateSettings({
      rentCycleDay: rentCycleDay.trim() || '1st of month',
      gracePeriod: gracePeriod.trim() || '5 days',
      lateFee: formattedLateFee,
    });
    setDraftRentCycleDay(null);
    setDraftGracePeriod(null);
    setDraftLateFee(null);
    setStatusNotice('Rental preferences saved and synced.');
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
                <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveHeaderButton, hasUnsavedRuleEdits && styles.saveHeaderButtonActive]}
              onPress={handleSaveSettings}
              activeOpacity={0.85}
            >
              <Text style={styles.saveHeaderButtonText}>
                {hasUnsavedRuleEdits ? 'Save*' : 'Save'}
              </Text>
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
                        {floorRooms.length} {floorRooms.length === 1 ? 'unit' : 'units'} · Next default: {nextDefaultRoom}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenEditFloorModal(floorName)}
                      >
                        <Feather name="edit-2" size={15} color={Palette.primary} />
                      </TouchableOpacity>
                      {floors.length > 1 && (
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleDeleteFloor(floorName)}
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

          {/* Section: Room Types Management */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ROOM TYPES ({roomTypes.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={handleOpenAddRoomTypeModal}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Room Type</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.apartmentsCard}>
            {roomTypes.map((type, idx) => {
              const isLast = idx === roomTypes.length - 1;
              const countForType = rooms.filter(
                (r) =>
                  r.type.toLowerCase().trim() === type.toLowerCase().trim() ||
                  r.type.toLowerCase().includes(type.toLowerCase())
              ).length;
              const typeDefaults = getDefaultsForType(type);

              return (
                <React.Fragment key={type}>
                  <View style={styles.apartmentItemRow}>
                    <View style={styles.aptIconCircle}>
                      <MaterialCommunityIcons name="floor-plan" size={20} color={Palette.accentText} />
                    </View>

                    <View style={styles.aptDetailsCol}>
                      <Text style={styles.aptNameText}>{type}</Text>
                      <Text style={styles.aptSubText}>
                        {countForType} {countForType === 1 ? 'unit' : 'units'} · Default {typeDefaults.rent} / {typeDefaults.deposit}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenEditRoomTypeModal(type)}
                      >
                        <Feather name="edit-2" size={15} color={Palette.primary} />
                      </TouchableOpacity>
                      {roomTypes.length > 1 && (
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleDeleteRoomType(type)}
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

          {/* Section: Units Management */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>UNITS LIST ({rooms.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={handleOpenAddRoomModal}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Unit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.apartmentsCard}>
            {sortedSettingsRooms.length === 0 ? (
              <View style={styles.emptySettingsRow}>
                <Text style={styles.emptySettingsText}>
                  No units configured yet. Tap + Add Unit to create one.
                </Text>
              </View>
            ) : (
              sortedSettingsRooms.map((rm, idx) => {
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
                        <Text style={styles.aptRoomsText}>
                          Rent: {rm.monthlyRent} · Deposit: {rm.depositAmount}
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleOpenEditRoomModal(rm)}
                        >
                          <Feather name="edit-2" size={15} color={Palette.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleDeleteRoom(rm)}
                        >
                          <Feather name="trash-2" size={16} color={Palette.status.overdue.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!isLast && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })
            )}
          </View>

          {/* Section: Maintenance Reasons */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>MAINTENANCE REASONS ({maintenanceReasons.length})</Text>
            <TouchableOpacity
              style={styles.addAptButton}
              onPress={handleOpenAddReasonModal}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
              <Text style={styles.addAptButtonText}>Add Reason</Text>
            </TouchableOpacity>
          </View>

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
                      <Text style={styles.aptSubText}>Available in Maintenance Categories</Text>
                    </View>

                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenEditReasonModal(reason)}
                      >
                        <Feather name="edit-2" size={15} color={Palette.primary} />
                      </TouchableOpacity>
                      {maintenanceReasons.length > 1 && (
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => handleDeleteReason(reason)}
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

          {/* Rent Collection Rules */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>RENT COLLECTION RULES</Text>

            <Text style={styles.fieldLabel}>Rent Due Cycle</Text>
            <View style={styles.presetChipsRow}>
              {RENT_CYCLE_PRESETS.map((preset) => {
                const active = rentCycleDay.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => {
                      setDraftRentCycleDay(null);
                      void updateSettings({ rentCycleDay: preset });
                      setStatusNotice(`Rent due cycle set to ${preset}.`);
                    }}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.textInput}
              value={rentCycleDay}
              onChangeText={setDraftRentCycleDay}
              placeholder="e.g. 1st of month"
              placeholderTextColor={Palette.textMuted}
            />

            <Text style={styles.fieldLabel}>Grace Period</Text>
            <View style={styles.presetChipsRow}>
              {GRACE_PERIOD_PRESETS.map((preset) => {
                const active = gracePeriod.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => {
                      setDraftGracePeriod(null);
                      void updateSettings({ gracePeriod: preset });
                      setStatusNotice(`Grace period set to ${preset}.`);
                    }}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Custom Grace Period</Text>
                <TextInput
                  style={styles.textInput}
                  value={gracePeriod}
                  onChangeText={setDraftGracePeriod}
                  placeholder="e.g. 5 days"
                  placeholderTextColor={Palette.textMuted}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Late Fee</Text>
                <TextInput
                  style={styles.textInput}
                  value={lateFee}
                  onChangeText={setDraftLateFee}
                  placeholder="e.g. ₹500"
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
                <Text style={styles.switchSub}>
                  {autoReminder
                    ? `Active · Notice 3 days before ${rentCycleDay}`
                    : 'Paused · Tap to enable monthly reminders'}
                </Text>
              </View>
              <Switch
                value={autoReminder}
                onValueChange={(val) => void updateSettings({ autoReminder: val })}
                trackColor={{ false: Palette.border, true: Palette.primary }}
                thumbColor={Palette.surface}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Maintenance Task Status</Text>
                <Text style={styles.switchSub}>
                  {maintenanceNotify
                    ? 'Active · Push updates when repair work completes'
                    : 'Paused · Tap to enable repair status alerts'}
                </Text>
              </View>
              <Switch
                value={maintenanceNotify}
                onValueChange={(val) => void updateSettings({ maintenanceNotify: val })}
                trackColor={{ false: Palette.border, true: Palette.primary }}
                thumbColor={Palette.surface}
              />
            </View>
          </View>

          {/* Workspace Data Management */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>WORKSPACE DATA</Text>

            <TouchableOpacity
              style={styles.switchRow}
              activeOpacity={0.75}
              onPress={() =>
                setConfirmDialog({
                  title: 'Restore Sample Data',
                  message:
                    'Replace current units, rent ledger, transactions, and notifications with default sample property data?',
                  confirmLabel: 'Restore',
                  onConfirm: () => {
                    setConfirmDialog(null);
                    void restoreSampleWorkspaceData();
                    setStatusNotice('Sample property data restored.');
                  },
                })
              }
            >
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Restore Sample Property Data</Text>
                <Text style={styles.switchSub}>Populate units, rent history, and transactions</Text>
              </View>
              <Feather name="refresh-cw" size={Typography.iconSize.sm} color={Palette.primary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.switchRow}
              activeOpacity={0.75}
              onPress={() =>
                setConfirmDialog({
                  title: 'Clear All Data',
                  message:
                    'Delete all units, rent records, deposits, transactions, and notifications to start with a blank building?',
                  confirmLabel: 'Clear All',
                  onConfirm: () => {
                    setConfirmDialog(null);
                    void clearAllWorkspaceData();
                    setStatusNotice('All workspace records cleared.');
                  },
                })
              }
            >
              <View style={styles.switchTextCol}>
                <Text style={[styles.switchTitle, { color: Palette.status.overdue.text }]}>
                  Start With Blank Workspace
                </Text>
                <Text style={styles.switchSub}>Clear sample units & records to add your own</Text>
              </View>
              <Feather name="trash-2" size={Typography.iconSize.sm} color={Palette.status.overdue.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add / Edit Floor Modal */}
      <Modal
        visible={isFloorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFloorModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsFloorModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFloorOriginal ? 'Rename Floor' : 'Add Floor'}
              </Text>
              <TouchableOpacity onPress={() => setIsFloorModalVisible(false)}>
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
                value={floorNameInput}
                onChangeText={(txt) => {
                  setFloorNameInput(txt);
                  if (modalError) setModalError(null);
                }}
              />

              {!editingFloorOriginal && (
                <>
                  <Text style={styles.inputLabel}>Initial Units on Floor (Optional)</Text>
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
                              onPress={() => {
                                const d = getDefaultsForType(type);
                                setNewFloorDefaultType(type);
                                setNewFloorRent(String(parseRupeeAmount(d.rent)));
                                setNewFloorDeposit(String(parseRupeeAmount(d.deposit)));
                              }}
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
                    const formatted = formatFloorLabel(floorNameInput) || 'New Floor';
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
                            ? `Will create ${safeCount} vacant units: ${previewRooms.join(', ')}${safeCount > 4 ? '...' : ''}`
                            : `First default unit on ${formatted}: ${nextSingle}`}
                        </Text>
                      </View>
                    );
                  })()}
                </>
              )}

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleSaveFloor}
              >
                <Text style={styles.saveAptBtnText}>
                  {editingFloorOriginal ? 'Update Floor' : 'Save Floor'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add / Edit Unit Modal */}
      <Modal
        visible={isRoomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRoomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsRoomModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoomId ? 'Edit Unit' : 'Add New Unit'}
              </Text>
              <TouchableOpacity onPress={() => setIsRoomModalVisible(false)}>
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

              <Text style={styles.inputLabel}>Unit Number *</Text>
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
              {!editingRoomId && (
                <Text style={styles.fieldHintText}>
                  Default for {newRoomFloor} ({selectedFloorCountInModal} existing units): {suggestedRoomNumInModal}
                </Text>
              )}

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
                          onPress={() => handleSelectRoomTypeInModal(type)}
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
                {(editingRoomId
                  ? (['Occupied', 'Rent due', 'Vacant'] as const)
                  : (['Occupied', 'Vacant'] as const)
                ).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusSelectBtn,
                      newStatus === st && styles.statusSelectBtnActive,
                    ]}
                    onPress={() => {
                      setNewStatus(st);
                      if (modalError) setModalError(null);
                    }}
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
                  <Text style={styles.inputLabel}>Primary Resident Name *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={Palette.textMuted}
                    value={newTenant}
                    onChangeText={(txt) => {
                      setNewTenant(txt);
                      if (modalError) setModalError(null);
                    }}
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

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Monthly Rent (₹)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 9500"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numeric"
                    value={newRent}
                    onChangeText={setNewRent}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Security Deposit (₹)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 19000"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numeric"
                    value={newDeposit}
                    onChangeText={setNewDeposit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleSaveRoom}
              >
                <Text style={styles.saveAptBtnText}>
                  {editingRoomId ? 'Update Unit' : 'Save Unit'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add / Edit Maintenance Reason Modal */}
      <Modal
        visible={isReasonModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReasonModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsReasonModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReasonOriginal ? 'Edit Maintenance Reason' : 'Add Maintenance Reason'}
              </Text>
              <TouchableOpacity onPress={() => setIsReasonModalVisible(false)}>
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
                value={reasonNameInput}
                onChangeText={(txt) => {
                  setReasonNameInput(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleSaveReason}
              >
                <Text style={styles.saveAptBtnText}>
                  {editingReasonOriginal ? 'Update Reason' : 'Save Reason'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add / Edit Room Type Modal */}
      <Modal
        visible={isRoomTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRoomTypeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsRoomTypeModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoomTypeOriginal ? 'Edit Room Type' : 'Add Room Type'}
              </Text>
              <TouchableOpacity onPress={() => setIsRoomTypeModalVisible(false)}>
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
                value={roomTypeNameInput}
                onChangeText={(txt) => {
                  setRoomTypeNameInput(txt);
                  if (modalError) setModalError(null);
                }}
                autoFocus
              />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Default Rent (₹)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 9500"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numeric"
                    value={roomTypeDefaultRentInput}
                    onChangeText={setRoomTypeDefaultRentInput}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Default Deposit (₹)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 19000"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numeric"
                    value={roomTypeDefaultDepositInput}
                    onChangeText={setRoomTypeDefaultDepositInput}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveAptBtn}
                activeOpacity={0.85}
                onPress={handleSaveRoomType}
              >
                <Text style={styles.saveAptBtnText}>
                  {editingRoomTypeOriginal ? 'Update Room Type' : 'Save Room Type'}
                </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
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
  saveHeaderButtonActive: {
    backgroundColor: Palette.secondary,
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
  emptySettingsRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptySettingsText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
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
    paddingRight: 8,
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
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
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  presetChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  presetChipText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  presetChipTextActive: {
    color: Palette.onPrimary,
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
