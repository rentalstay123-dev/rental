import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';

export interface RoomsViewProps {
  rooms?: RoomItem[];
  setRooms?: React.Dispatch<React.SetStateAction<RoomItem[]>>;
  roomTypes?: string[];
  floors?: string[];
  onBack?: () => void;
}

export type FurnishedStatus = 'Fully Furnished' | 'Semi-Furnished' | 'Unfurnished';
export type BookingType = 'Family' | 'Bachelor';

export interface RoomMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  imageUri?: string;
  documentName?: string;
  documentUri?: string;
}

export interface RoomItem {
  id: string;
  roomNumber: string;
  floor?: string;
  wing: string;
  type: string;
  monthlyRent: string;
  depositAmount: string;
  status: 'Occupied' | 'Rent due' | 'Vacant';
  joinedDate?: string;
  roomsCount?: number;
  bathrooms?: number;
  balconies?: number;
  furnished?: FurnishedStatus;
  furnishings?: string[];
  areaSqFt?: string;
  bookingType?: BookingType;
  members: RoomMember[];
}

export interface ResolvedRoomSpecs {
  roomsCount: number;
  bathrooms: number;
  balconies: number;
  furnished: FurnishedStatus;
  furnishings: string[];
  areaSqFt: string;
}

const DEFAULT_SPECS_BY_TYPE: Record<string, ResolvedRoomSpecs> = {
  '1bhk': {
    roomsCount: 2,
    bathrooms: 1,
    balconies: 1,
    furnished: 'Semi-Furnished',
    areaSqFt: '620 sq ft',
    furnishings: [
      'Queen Bed & Mattress',
      '2-Door Wardrobe',
      'Split AC',
      'Modular Kitchen',
      'Geyser',
      'Ceiling Fans (2)',
      'LED Tube Lights',
    ],
  },
  '2bhk': {
    roomsCount: 3,
    bathrooms: 2,
    balconies: 2,
    furnished: 'Fully Furnished',
    areaSqFt: '980 sq ft',
    furnishings: [
      'Double Beds (2)',
      'Wardrobes (2)',
      'Sofa Set (3-Seater)',
      '4-Seater Dining Table',
      'Split ACs (2)',
      'Modular Kitchen',
      'Geysers (2)',
      'Washing Machine',
    ],
  },
  '3bhk': {
    roomsCount: 4,
    bathrooms: 3,
    balconies: 2,
    furnished: 'Fully Furnished',
    areaSqFt: '1,350 sq ft',
    furnishings: [
      'King & Queen Beds (3)',
      'Wardrobes (3)',
      'L-Shaped Sofa & Center Table',
      '6-Seater Dining Table',
      'Split ACs (3)',
      'Modular Kitchen & Chimney',
      'Geysers (3)',
      'Refrigerator & TV Unit',
    ],
  },
  studio1rk: {
    roomsCount: 1,
    bathrooms: 1,
    balconies: 1,
    furnished: 'Semi-Furnished',
    areaSqFt: '380 sq ft',
    furnishings: [
      'Queen Bed & Mattress',
      'Study Desk & Chair',
      '2-Door Wardrobe',
      'Kitchenette Counter',
      'Geyser',
      'Ceiling Fan',
    ],
  },
};

export const getRoomSpecs = (room: RoomItem): ResolvedRoomSpecs => {
  const normalized = room.type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const fallback =
    DEFAULT_SPECS_BY_TYPE[normalized] ||
    (normalized.includes('3bhk')
      ? DEFAULT_SPECS_BY_TYPE['3bhk']
      : normalized.includes('2bhk')
        ? DEFAULT_SPECS_BY_TYPE['2bhk']
        : normalized.includes('studio') || normalized.includes('1rk')
          ? DEFAULT_SPECS_BY_TYPE.studio1rk
          : DEFAULT_SPECS_BY_TYPE['1bhk']);

  return {
    roomsCount: room.roomsCount ?? fallback.roomsCount,
    bathrooms: room.bathrooms ?? fallback.bathrooms,
    balconies: room.balconies ?? fallback.balconies,
    furnished: room.furnished ?? fallback.furnished,
    furnishings: room.furnishings && room.furnishings.length > 0 ? room.furnishings : fallback.furnishings,
    areaSqFt: room.areaSqFt ?? fallback.areaSqFt,
  };
};

export const INITIAL_ROOM_TYPES: string[] = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  'Studio / 1 RK',
];

export const INITIAL_FLOORS: string[] = [
  'Floor 1',
  'Floor 2',
  'Floor 3',
];

export const formatFloorLabel = (rawInput: string): string => {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) {
    return `Floor ${parseInt(trimmed, 10)}`;
  }
  const ordinalMatch = trimmed.match(/^(\d+)(?:st|nd|rd|th)?\s*floor$/i);
  if (ordinalMatch) {
    return `Floor ${parseInt(ordinalMatch[1], 10)}`;
  }
  const floorPrefixMatch = trimmed.match(/^floor\s*(\d+)$/i);
  if (floorPrefixMatch) {
    return `Floor ${parseInt(floorPrefixMatch[1], 10)}`;
  }
  if (/^ground(\s*floor)?$/i.test(trimmed)) {
    return 'Ground Floor';
  }
  return trimmed;
};

export const extractFloorNumber = (floorName: string): number | null => {
  const trimmed = floorName.trim();
  if (/ground/i.test(trimmed)) return 0;
  const numMatch = trimmed.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return null;
};

export const matchesFloorName = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const normA = formatFloorLabel(a).toLowerCase();
  const normB = formatFloorLabel(b).toLowerCase();
  if (normA === normB) return true;
  const numA = extractFloorNumber(a);
  const numB = extractFloorNumber(b);
  if (numA !== null && numB !== null) return numA === numB;
  return false;
};

export const getRoomFloor = (room: RoomItem): string => {
  if (room.floor && room.floor.trim()) {
    return formatFloorLabel(room.floor);
  }
  if (room.wing) {
    const floorMatch = room.wing.match(/(ground\s*floor|floor\s*\d+|\d+(?:st|nd|rd|th)?\s*floor)/i);
    if (floorMatch) {
      return formatFloorLabel(floorMatch[1]);
    }
    const primarySegment = room.wing.split('·')[0].trim();
    if (primarySegment) return formatFloorLabel(primarySegment);
  }
  const digits = parseInt(room.roomNumber.replace(/[^0-9]/g, ''), 10);
  if (!Number.isNaN(digits) && digits >= 100) {
    return `Floor ${Math.floor(digits / 100)}`;
  }
  return 'Floor 1';
};

export const getDefaultNextRoomNumber = (
  floorName: string,
  rooms: RoomItem[],
  floorIndexFallback = 0
): string => {
  const floorNum = extractFloorNumber(floorName);
  const effectiveLevel =
    floorNum !== null ? (floorNum === 0 ? 0 : floorNum) : floorIndexFallback + 1;

  const floorRooms = rooms.filter((r) => matchesFloorName(getRoomFloor(r), floorName));
  const existingNumbersOnFloor = new Set(
    floorRooms
      .map((r) => parseInt(r.roomNumber.replace(/[^0-9]/g, ''), 10))
      .filter((n) => !Number.isNaN(n))
  );
  const existingAllNumbers = new Set(
    rooms
      .map((r) => parseInt(r.roomNumber.replace(/[^0-9]/g, ''), 10))
      .filter((n) => !Number.isNaN(n))
  );

  if (effectiveLevel === 0) {
    let idx = floorRooms.length + 1;
    const existingLabels = new Set(rooms.map((r) => r.roomNumber.trim().toLowerCase()));
    while (
      existingLabels.has(`room g${String(idx).padStart(2, '0')}`) ||
      existingLabels.has(`g${String(idx).padStart(2, '0')}`)
    ) {
      idx += 1;
    }
    return `Room G${String(idx).padStart(2, '0')}`;
  }

  const base = effectiveLevel * 100;
  let candidate = base + floorRooms.length + 1;
  while (existingNumbersOnFloor.has(candidate) || existingAllNumbers.has(candidate)) {
    candidate += 1;
  }
  return `Room ${candidate}`;
};

export const sortRoomNumbers = (a: RoomItem, b: RoomItem): number => {
  const numA = parseInt(a.roomNumber.replace(/[^0-9]/g, ''), 10);
  const numB = parseInt(b.roomNumber.replace(/[^0-9]/g, ''), 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.roomNumber.localeCompare(b.roomNumber);
};

export const matchesRoomType = (roomType?: string, selectedType?: string): boolean => {
  if (!roomType || !selectedType) return false;
  const r = roomType.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const s = selectedType.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (r === s) return true;
  if (r.startsWith(s) || s.startsWith(r)) return true;
  if (r.includes(s) || s.includes(r)) return true;
  return false;
};

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
];

const SAMPLE_DOCUMENTS = [
  'Aadhaar_ID_Proof.pdf',
  'PAN_Verification.pdf',
  'Passport_Copy.pdf',
];

export const INITIAL_ROOMS: RoomItem[] = [
  {
    id: '1',
    roomNumber: 'Room 101',
    wing: 'Floor 1 · East Wing',
    type: '1 BHK',
    monthlyRent: '₹9,000',
    depositAmount: '₹20,000',
    joinedDate: 'Jan 15, 2026',
    status: 'Occupied',
    bookingType: 'Family',
    roomsCount: 2,
    bathrooms: 1,
    balconies: 1,
    areaSqFt: '620 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Queen Bed & Mattress',
      '2-Door Wardrobe',
      'Split AC',
      'Modular Kitchen',
      'Geyser',
      'Ceiling Fans (2)',
    ],
    members: [
      {
        id: 'm1',
        name: 'Anil Rao',
        role: 'Primary Resident',
        phone: '+91 98450 11223',
        imageUri: SAMPLE_AVATARS[1],
        documentName: 'Aadhaar_Anil_Rao.pdf',
      },
      {
        id: 'm2',
        name: 'Kavita Rao',
        role: 'Spouse / Co-occupant',
        phone: '+91 98450 33445',
        imageUri: SAMPLE_AVATARS[0],
        documentName: 'Aadhaar_Kavita_Rao.pdf',
      },
    ],
  },
  {
    id: '2',
    roomNumber: 'Room 102',
    wing: 'Floor 1 · West Wing',
    type: '2 BHK',
    monthlyRent: '₹8,500',
    depositAmount: '₹18,000',
    joinedDate: 'Mar 01, 2026',
    status: 'Rent due',
    bookingType: 'Family',
    roomsCount: 3,
    bathrooms: 2,
    balconies: 2,
    areaSqFt: '960 sq ft',
    furnished: 'Fully Furnished',
    furnishings: [
      'Double Beds (2)',
      'Wardrobes (2)',
      'Sofa Set (3-Seater)',
      'Dining Table (4-Seater)',
      'Split ACs (2)',
      'Modular Kitchen',
      'Geysers (2)',
      'Washing Machine',
    ],
    members: [
      {
        id: 'm3',
        name: 'Priya Sharma',
        role: 'Primary Resident',
        phone: '+91 98765 43210',
        imageUri: SAMPLE_AVATARS[2],
        documentName: 'PAN_Priya_Sharma.pdf',
      },
      {
        id: 'm4',
        name: 'Deepa Sharma',
        role: 'Sister / Co-occupant',
        phone: '+91 98765 67890',
        documentName: 'Aadhaar_Deepa_Sharma.pdf',
      },
    ],
  },
  {
    id: '3',
    roomNumber: 'Room 103',
    wing: 'Floor 1 · East Wing',
    type: 'Studio / 1 RK',
    monthlyRent: '₹9,000',
    depositAmount: '₹18,000',
    joinedDate: 'Feb 10, 2026',
    status: 'Occupied',
    bookingType: 'Bachelor',
    roomsCount: 1,
    bathrooms: 1,
    balconies: 1,
    areaSqFt: '390 sq ft',
    furnished: 'Fully Furnished',
    furnishings: [
      'Queen Bed & Mattress',
      'Study Desk & Ergonomic Chair',
      '2-Door Wardrobe',
      'Split AC',
      'Kitchenette Counter & Induction',
      'Geyser',
    ],
    members: [
      {
        id: 'm5',
        name: 'Kiran Das',
        role: 'Primary Resident',
        phone: '+91 98123 45678',
        imageUri: SAMPLE_AVATARS[3],
        documentName: 'Passport_Kiran_Das.pdf',
      },
    ],
  },
  {
    id: '4',
    roomNumber: 'Room 104',
    wing: 'Floor 1 · North Wing',
    type: '1 BHK',
    monthlyRent: '₹9,500',
    depositAmount: '₹19,000',
    joinedDate: 'Apr 05, 2026',
    status: 'Occupied',
    bookingType: 'Family',
    roomsCount: 2,
    bathrooms: 1,
    balconies: 1,
    areaSqFt: '640 sq ft',
    furnished: 'Fully Furnished',
    furnishings: [
      'Queen Bed & Mattress',
      '3-Door Wardrobe',
      'Sofa Set (2-Seater)',
      'Coffee Table',
      'Split AC',
      'Modular Kitchen',
      'Refrigerator & Geyser',
    ],
    members: [
      {
        id: 'm6',
        name: 'Sana Khan',
        role: 'Primary Resident',
        phone: '+91 97400 99881',
        documentName: 'Aadhaar_Sana_Khan.pdf',
      },
      {
        id: 'm7',
        name: 'Zoya Khan',
        role: 'Co-occupant / Dependent',
        phone: '+91 97400 99882',
        documentName: 'Aadhaar_Zoya_Khan.pdf',
      },
    ],
  },
  {
    id: '5',
    roomNumber: 'Room 201',
    wing: 'Floor 2 · East Wing',
    type: '1 BHK',
    monthlyRent: '₹10,000',
    depositAmount: '₹20,000',
    joinedDate: 'May 12, 2026',
    status: 'Rent due',
    bookingType: 'Bachelor',
    roomsCount: 2,
    bathrooms: 1,
    balconies: 2,
    areaSqFt: '650 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Queen Bed & Mattress',
      'Wardrobe',
      'Work Desk',
      'Modular Kitchen',
      'Geyser',
      'Ceiling Fans (2)',
    ],
    members: [
      {
        id: 'm8',
        name: 'Arjun Kumar',
        role: 'Primary Resident',
        phone: '+91 99001 22334',
        documentName: 'PAN_Arjun_Kumar.pdf',
      },
    ],
  },
  {
    id: '6',
    roomNumber: 'Room 204',
    wing: 'Floor 2 · West Wing',
    type: '1 BHK',
    monthlyRent: '₹9,500',
    depositAmount: '₹20,000',
    status: 'Vacant',
    roomsCount: 2,
    bathrooms: 1,
    balconies: 1,
    areaSqFt: '615 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Queen Bed Frame',
      '2-Door Wardrobe',
      'Modular Kitchen Cabinets',
      'Geyser',
      'Ceiling Fans (2)',
      'Curtain Rods',
    ],
    members: [],
  },
  {
    id: '7',
    roomNumber: 'Room 202',
    wing: 'Floor 2 · North Wing',
    type: '2 BHK',
    monthlyRent: '₹12,000',
    depositAmount: '₹24,000',
    joinedDate: 'Jun 10, 2026',
    status: 'Occupied',
    bookingType: 'Bachelor',
    roomsCount: 3,
    bathrooms: 2,
    balconies: 1,
    areaSqFt: '1,020 sq ft',
    furnished: 'Fully Furnished',
    furnishings: [
      'Double Beds (2)',
      'Wardrobes (2)',
      'Sofa & Center Table',
      'Split ACs (2)',
      'Modular Kitchen',
      'Refrigerator & Geysers (2)',
    ],
    members: [
      {
        id: 'm9',
        name: 'Sneha Patel',
        role: 'Primary Resident',
        phone: '+91 98450 67123',
        documentName: 'Aadhaar_Sneha_Patel.pdf',
      },
    ],
  },
  {
    id: '8',
    roomNumber: 'Room 205',
    wing: 'Floor 2 · South Wing',
    type: '2 BHK',
    monthlyRent: '₹12,500',
    depositAmount: '₹25,000',
    status: 'Vacant',
    roomsCount: 3,
    bathrooms: 2,
    balconies: 2,
    areaSqFt: '1,050 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Double Beds (2)',
      'Built-in Wardrobes (2)',
      'Modular Kitchen & Utility Sink',
      'Geysers (2)',
      'Ceiling Fans (3)',
      'Exhaust Fans',
    ],
    members: [],
  },
  {
    id: '9',
    roomNumber: 'Room 301',
    wing: 'Floor 3 · East Wing',
    type: '3 BHK',
    monthlyRent: '₹18,000',
    depositAmount: '₹36,000',
    joinedDate: 'Jan 20, 2026',
    status: 'Occupied',
    bookingType: 'Family',
    roomsCount: 4,
    bathrooms: 3,
    balconies: 3,
    areaSqFt: '1,420 sq ft',
    furnished: 'Fully Furnished',
    furnishings: [
      'King & Queen Beds (3)',
      'Wardrobes (3)',
      'L-Shaped Sofa & TV Unit',
      '6-Seater Dining Table',
      'Split ACs (3)',
      'Modular Kitchen & Chimney',
      'Geysers (3)',
      'Washing Machine & Fridge',
    ],
    members: [
      {
        id: 'm10',
        name: 'Rajesh Hegde',
        role: 'Primary Resident',
        phone: '+91 99880 11224',
        documentName: 'Aadhaar_Rajesh_Hegde.pdf',
      },
    ],
  },
  {
    id: '10',
    roomNumber: 'Room 302',
    wing: 'Floor 3 · West Wing',
    type: '3 BHK',
    monthlyRent: '₹18,500',
    depositAmount: '₹37,000',
    status: 'Vacant',
    roomsCount: 4,
    bathrooms: 3,
    balconies: 2,
    areaSqFt: '1,380 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Queen Beds (3)',
      'Sliding Wardrobes (3)',
      'Modular Kitchen & Chimney',
      'Geysers (3)',
      'Ceiling Fans (4)',
      'LED Lighting Fixtures',
    ],
    members: [],
  },
  {
    id: '11',
    roomNumber: 'Room 105',
    wing: 'Floor 1 · South Wing',
    type: 'Studio / 1 RK',
    monthlyRent: '₹7,500',
    depositAmount: '₹15,000',
    status: 'Vacant',
    roomsCount: 1,
    bathrooms: 1,
    balconies: 1,
    areaSqFt: '360 sq ft',
    furnished: 'Semi-Furnished',
    furnishings: [
      'Single/Queen Bed',
      'Study Table & Chair',
      'Wardrobe',
      'Kitchenette Counter',
      'Geyser',
      'Ceiling Fan',
    ],
    members: [],
  },
];

interface BookingMemberDraft {
  name: string;
  phone: string;
  documentName: string;
  documentUri: string;
  imageUri: string;
}

interface BookingReceipt {
  roomNumber: string;
  type: string;
  bookingType: BookingType;
  memberNames: string[];
  monthlyRent: string;
  joinedDate: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface WebFile {
  name: string;
}

interface WebFileInput {
  type: string;
  accept: string;
  files?: { 0?: WebFile; length?: number };
  onchange: (() => void) | null;
  click: () => void;
}

interface WebGlobalEnv {
  document?: {
    createElement: (tag: string) => WebFileInput;
  };
  URL?: {
    createObjectURL: (file: unknown) => string;
  };
}

const createEmptyMemberDraft = (): BookingMemberDraft => ({
  name: '',
  phone: '',
  documentName: '',
  documentUri: '',
  imageUri: '',
});

const pickWebFile = (
  accept: string,
  onSelected: (fileName: string, uri: string) => void
): boolean => {
  const webEnv = globalThis as unknown as WebGlobalEnv;
  if (!webEnv.document) return false;
  const input = webEnv.document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const uri = webEnv.URL?.createObjectURL ? webEnv.URL.createObjectURL(file) : '';
    onSelected(file.name, uri);
  };
  input.click();
  return true;
};

export default function RoomsView({
  rooms: propRooms,
  setRooms: propSetRooms,
  roomTypes: propRoomTypes,
  floors: propFloors,
  onBack,
}: RoomsViewProps) {
  const { refreshWorkspace } = useAppData();

  const [localRooms, setLocalRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const rooms = propRooms || localRooms;
  const setRooms = propSetRooms || setLocalRooms;

  const [localRoomTypes] = useState<string[]>(INITIAL_ROOM_TYPES);
  const roomTypes = propRoomTypes || localRoomTypes;

  const [localFloors] = useState<string[]>(INITIAL_FLOORS);
  const floors = propFloors || localFloors;

  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Occupied' | 'Vacant'>('All');
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'main' | 'details' | 'book'>('main');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [bookReturnScreen, setBookReturnScreen] = useState<'main' | 'details'>('main');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  // Financial inline editing state
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [editRent, setEditRent] = useState('');
  const [editDeposit, setEditDeposit] = useState('');

  // Book Room form state
  const [bookingType, setBookingType] = useState<BookingType>('Family');
  const [bookingMembers, setBookingMembers] = useState<[BookingMemberDraft, BookingMemberDraft]>([
    createEmptyMemberDraft(),
    createEmptyMemberDraft(),
  ]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingReceipt, setBookingReceipt] = useState<BookingReceipt | null>(null);

  // Cross-platform notice banner & destructive action confirmation dialog
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;
  const effectiveScreen = activeScreen !== 'main' && !activeRoom ? 'main' : activeScreen;

  const displayFloors = React.useMemo(() => {
    const list = [...floors];
    rooms.forEach((r) => {
      const rf = getRoomFloor(r);
      if (!list.some((f) => matchesFloorName(f, rf))) {
        list.push(rf);
      }
    });
    return list;
  }, [floors, rooms]);

  const totalOccupiedCount = rooms.filter(
    (r) => r.status === 'Occupied' || r.status === 'Rent due'
  ).length;
  const totalVacantCount = rooms.filter((r) => r.status === 'Vacant').length;

  const currentFloorRooms = React.useMemo(() => {
    if (!selectedFloor) return [];
    return rooms.filter((r) => matchesFloorName(getRoomFloor(r), selectedFloor));
  }, [selectedFloor, rooms]);
  const floorOccupiedCount = currentFloorRooms.filter(
    (r) => r.status === 'Occupied' || r.status === 'Rent due'
  ).length;
  const floorVacantCount = currentFloorRooms.filter((r) => r.status === 'Vacant').length;

  const floorRoomTypes = React.useMemo(() => {
    if (!selectedFloor) return [];
    const matching = roomTypes.filter((type) =>
      currentFloorRooms.some((r) => matchesRoomType(r.type, type))
    );
    currentFloorRooms.forEach((r) => {
      if (!matching.some((t) => matchesRoomType(r.type, t))) {
        matching.push(r.type);
      }
    });
    return matching;
  }, [selectedFloor, roomTypes, currentFloorRooms]);

  const currentTypeRooms =
    selectedFloor && selectedRoomType
      ? currentFloorRooms
          .filter((r) => matchesRoomType(r.type, selectedRoomType))
          .sort(sortRoomNumbers)
      : [];
  const typeOccupiedCount = currentTypeRooms.filter(
    (r) => r.status === 'Occupied' || r.status === 'Rent due'
  ).length;
  const typeVacantCount = currentTypeRooms.filter((r) => r.status === 'Vacant').length;

  const filteredRooms = currentTypeRooms.filter((room) => {
    if (filter === 'All') return true;
    if (filter === 'Occupied') return room.status === 'Occupied' || room.status === 'Rent due';
    if (filter === 'Vacant') return room.status === 'Vacant';
    return true;
  });

  const handleOpenDetails = (room: RoomItem) => {
    setActiveRoomId(room.id);
    setIsEditingFinancials(false);
    setStatusNotice(null);
    setActiveScreen('details');
  };

  const handleOpenBook = (room: RoomItem, from: 'main' | 'details') => {
    setBookingType('Family');
    setBookingMembers([createEmptyMemberDraft(), createEmptyMemberDraft()]);
    setBookingError(null);
    setStatusNotice(null);
    setActiveRoomId(room.id);
    setBookReturnScreen(from);
    setActiveScreen('book');
  };

  const handleStartEditFinancials = () => {
    if (!activeRoom) return;
    setEditRent(activeRoom.monthlyRent.replace(/[^0-9]/g, ''));
    setEditDeposit(activeRoom.depositAmount.replace(/[^0-9]/g, ''));
    setIsEditingFinancials(true);
  };

  const handleSaveFinancials = () => {
    if (!activeRoom) return;
    const cleanRent = editRent.replace(/[^0-9]/g, '');
    const cleanDeposit = editDeposit.replace(/[^0-9]/g, '');

    const newRentFormatted = cleanRent
      ? `₹${Number(cleanRent).toLocaleString('en-IN')}`
      : activeRoom.monthlyRent;
    const newDepositFormatted = cleanDeposit
      ? `₹${Number(cleanDeposit).toLocaleString('en-IN')}`
      : activeRoom.depositAmount;

    const updatedRoom: RoomItem = {
      ...activeRoom,
      monthlyRent: newRentFormatted,
      depositAmount: newDepositFormatted,
    };

    setRooms(rooms.map((r) => (r.id === activeRoom.id ? updatedRoom : r)));
    setIsEditingFinancials(false);
    setStatusNotice(`Updated rent and deposit for ${activeRoom.roomNumber}.`);
  };

  const updateMemberDraft = (index: 0 | 1, patch: Partial<BookingMemberDraft>) => {
    setBookingMembers((prev) => {
      const next: [BookingMemberDraft, BookingMemberDraft] = [
        { ...prev[0] },
        { ...prev[1] },
      ];
      next[index] = { ...next[index], ...patch };
      return next;
    });
    if (bookingError) setBookingError(null);
  };

  const handlePickDocument = (index: 0 | 1) => {
    if (Platform.OS === 'web') {
      const opened = pickWebFile('.pdf,.jpg,.jpeg,.png,.doc,.docx', (fileName, uri) => {
        updateMemberDraft(index, { documentName: fileName, documentUri: uri });
      });
      if (opened) return;
    }
    const fallbackDoc = SAMPLE_DOCUMENTS[index % SAMPLE_DOCUMENTS.length];
    updateMemberDraft(index, { documentName: fallbackDoc, documentUri: '' });
  };

  const handlePickPhoto = (index: 0 | 1) => {
    if (Platform.OS === 'web') {
      const opened = pickWebFile('image/*', (_fileName, uri) => {
        if (uri) updateMemberDraft(index, { imageUri: uri });
      });
      if (opened) return;
    }
    const fallbackAvatar = SAMPLE_AVATARS[index % SAMPLE_AVATARS.length];
    updateMemberDraft(index, { imageUri: fallbackAvatar });
  };

  const handleConfirmBooking = () => {
    if (!activeRoom) return;
    const requiredCount = bookingType === 'Family' ? 2 : 1;

    for (let i = 0; i < requiredCount; i++) {
      const idx = i as 0 | 1;
      const draft = bookingMembers[idx];
      const memberLabel = bookingType === 'Family' ? `Member ${idx + 1}` : 'Resident';

      if (!draft.name.trim()) {
        setBookingError(`Please enter ${memberLabel} name.`);
        return;
      }
      if (!draft.phone.trim()) {
        setBookingError(`Please enter ${memberLabel} contact number.`);
        return;
      }
      if (!draft.documentName.trim()) {
        setBookingError(`Please upload ID document for ${memberLabel}.`);
        return;
      }
      if (!draft.imageUri.trim()) {
        setBookingError(`Please upload photo for ${memberLabel}.`);
        return;
      }
    }

    const joinedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const newMembers: RoomMember[] = Array.from({ length: requiredCount }, (_, idx) => {
      const draft = bookingMembers[idx as 0 | 1];
      return {
        id: `${Date.now()}-${idx + 1}`,
        name: draft.name.trim(),
        role:
          idx === 0
            ? 'Primary Resident'
            : bookingType === 'Family'
              ? 'Family Member / Co-occupant'
              : 'Co-occupant',
        phone: draft.phone.trim(),
        imageUri: draft.imageUri,
        documentName: draft.documentName,
        documentUri: draft.documentUri || undefined,
      };
    });

    const updatedRoom: RoomItem = {
      ...activeRoom,
      status: 'Occupied',
      bookingType,
      joinedDate,
      members: newMembers,
    };

    setRooms(rooms.map((r) => (r.id === activeRoom.id ? updatedRoom : r)));
    setBookingError(null);
    setBookingReceipt({
      roomNumber: activeRoom.roomNumber,
      type: activeRoom.type,
      bookingType,
      memberNames: newMembers.map((m) => m.name),
      monthlyRent: activeRoom.monthlyRent,
      joinedDate,
    });
  };

  const handleRequestDeleteMember = (member: RoomMember) => {
    if (!activeRoom) return;
    setConfirmDialog({
      title: 'Remove Member',
      message: `Remove ${member.name} from ${activeRoom.roomNumber}?`,
      confirmLabel: 'Remove',
      onConfirm: () => {
        const updatedMembers = activeRoom.members.filter((m) => m.id !== member.id);
        const updatedStatus: RoomItem['status'] =
          updatedMembers.length > 0 ? activeRoom.status : 'Vacant';
        const updatedRoom: RoomItem = {
          ...activeRoom,
          status: updatedStatus,
          bookingType: updatedMembers.length > 0 ? activeRoom.bookingType : undefined,
          joinedDate: updatedMembers.length > 0 ? activeRoom.joinedDate : undefined,
          members: updatedMembers,
        };
        setRooms(rooms.map((r) => (r.id === activeRoom.id ? updatedRoom : r)));
        setStatusNotice(`${member.name} has been removed from ${activeRoom.roomNumber}.`);
        setConfirmDialog(null);
      },
    });
  };

  const handleRequestDeleteRoom = (room: RoomItem) => {
    setConfirmDialog({
      title: 'Delete Room',
      message: `Delete ${room.roomNumber}? This action cannot be undone.`,
      confirmLabel: 'Delete Room',
      onConfirm: () => {
        setRooms(rooms.filter((r) => r.id !== room.id));
        if (expandedRoomId === room.id) setExpandedRoomId(null);
        setActiveRoomId(null);
        setActiveScreen('main');
        setStatusNotice(`${room.roomNumber} has been deleted.`);
        setConfirmDialog(null);
      },
    });
  };

  const renderMemberBookingCard = (memberIndex: 0 | 1) => {
    const draft = bookingMembers[memberIndex];
    const isPrimary = memberIndex === 0;
    const badgeLabel = isPrimary ? 'MEMBER 1 · PRIMARY' : 'MEMBER 2 · FAMILY';

    return (
      <View key={memberIndex} style={styles.memberFormCard}>
        <View style={styles.memberFormHeader}>
          <View style={styles.memberFormBadge}>
            <Text style={styles.memberFormBadgeText}>{badgeLabel}</Text>
          </View>
          <Text style={styles.memberFormTitle}>
            {isPrimary ? 'Primary Member' : 'Second Member'}
          </Text>
        </View>

        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput
          style={styles.inputField}
          placeholder={isPrimary ? 'e.g. Rahul Sharma' : 'e.g. Neha Sharma'}
          placeholderTextColor={Palette.textMuted}
          value={draft.name}
          onChangeText={(text) => updateMemberDraft(memberIndex, { name: text })}
        />

        <Text style={styles.inputLabel}>Contact Number *</Text>
        <TextInput
          style={styles.inputField}
          placeholder="e.g. +91 98765 43210"
          placeholderTextColor={Palette.textMuted}
          keyboardType="phone-pad"
          value={draft.phone}
          onChangeText={(text) => updateMemberDraft(memberIndex, { phone: text })}
        />

        <Text style={styles.inputLabel}>Document Upload *</Text>
        {draft.documentName ? (
          <View style={styles.uploadedDocContainer}>
            <View style={styles.docIconBox}>
              <Feather name="file-text" size={Typography.iconSize.base} color={Palette.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docFileName} numberOfLines={1}>
                {draft.documentName}
              </Text>
              <TouchableOpacity onPress={() => handlePickDocument(memberIndex)}>
                <Text style={styles.changePhotoText}>Change document</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => updateMemberDraft(memberIndex, { documentName: '', documentUri: '' })}
            >
              <Feather name="x-circle" size={Typography.iconSize.base} color={Palette.status.overdue.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.75}
              onPress={() => handlePickDocument(memberIndex)}
            >
              <Feather name="upload" size={Typography.iconSize.base} color={Palette.accentText} />
              <Text style={styles.uploadBoxText}>Upload Document</Text>
              <Text style={styles.uploadBoxSub}>Aadhaar, PAN, or Passport (PDF / Image)</Text>
            </TouchableOpacity>
            <View style={styles.sampleRow}>
              <Text style={styles.sampleRowLabel}>Quick attach:</Text>
              {SAMPLE_DOCUMENTS.map((docName) => (
                <TouchableOpacity
                  key={docName}
                  style={styles.sampleDocChip}
                  activeOpacity={0.75}
                  onPress={() => updateMemberDraft(memberIndex, { documentName: docName, documentUri: '' })}
                >
                  <Text style={styles.sampleDocChipText}>{docName.replace('.pdf', '')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.inputLabel}>Photo Upload *</Text>
        {draft.imageUri ? (
          <View style={styles.uploadedPreviewContainer}>
            <Image source={{ uri: draft.imageUri }} style={styles.uploadedAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.photoUploadedText}>Photo selected</Text>
              <TouchableOpacity onPress={() => handlePickPhoto(memberIndex)}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => updateMemberDraft(memberIndex, { imageUri: '' })}>
              <Feather name="x-circle" size={Typography.iconSize.base} color={Palette.status.overdue.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.75}
              onPress={() => handlePickPhoto(memberIndex)}
            >
              <Feather name="camera" size={Typography.iconSize.base} color={Palette.accentText} />
              <Text style={styles.uploadBoxText}>Upload Photo</Text>
              <Text style={styles.uploadBoxSub}>Select passport or profile photo</Text>
            </TouchableOpacity>
            <View style={styles.sampleRow}>
              <Text style={styles.sampleRowLabel}>Quick pick:</Text>
              {SAMPLE_AVATARS.map((avatarUri, avatarIdx) => (
                <TouchableOpacity
                  key={avatarUri}
                  style={styles.sampleAvatarThumbWrap}
                  activeOpacity={0.8}
                  onPress={() => updateMemberDraft(memberIndex, { imageUri: avatarUri })}
                >
                  <Image source={{ uri: avatarUri }} style={styles.sampleAvatarThumb} />
                  <Text style={styles.sampleDocChipText}>{avatarIdx + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    );
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
          {effectiveScreen === 'details' && activeRoom ? (
            /* --- SEPARATE PAGE: FULL ROOM DETAILS --- */
            (() => {
              const specs = getRoomSpecs(activeRoom);
              const isOccupied = activeRoom.status === 'Occupied';
              const isRentDue = activeRoom.status === 'Rent due';
              const isVacant = activeRoom.status === 'Vacant';

              return (
                <>
                  <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                      <TouchableOpacity
                        style={styles.backButtonCircle}
                        onPress={() => {
                          setIsEditingFinancials(false);
                          setStatusNotice(null);
                          setActiveScreen('main');
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
                      </TouchableOpacity>
                      <View>
                        <Text style={styles.headerTitle}>{activeRoom.roomNumber} - Details</Text>
                        <Text style={styles.headerSubtitle}>
                          {activeRoom.wing} · {activeRoom.type}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {statusNotice ? (
                    <View style={styles.noticeBanner}>
                      <Text style={styles.noticeBannerText}>{statusNotice}</Text>
                      <TouchableOpacity onPress={() => setStatusNotice(null)}>
                        <Text style={styles.noticeDismissText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Overview & Financial Card */}
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsBannerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomNumberText}>{activeRoom.roomNumber}</Text>
                        <Text style={styles.detailsBannerSub}>
                          {activeRoom.wing} · {activeRoom.type}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOccupied && styles.occupiedText,
                          isRentDue && styles.rentDueText,
                          isVacant && styles.vacantText,
                        ]}
                      >
                        {activeRoom.status}
                      </Text>
                    </View>

                    {isEditingFinancials ? (
                      <View style={styles.financialEditCard}>
                        <View style={styles.financialEditHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather name="edit-3" size={Typography.iconSize.sm} color={Palette.accentText} />
                            <Text style={styles.financialEditTitle}>Edit Rent & Deposit</Text>
                          </View>
                          <TouchableOpacity onPress={() => setIsEditingFinancials(false)}>
                            <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
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
                          <Text style={styles.finValue}>{activeRoom.monthlyRent}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.financialBox}
                          activeOpacity={0.7}
                          onPress={handleStartEditFinancials}
                        >
                          <Text style={styles.finLabel}>Deposit</Text>
                          <Text style={styles.finValue}>{activeRoom.depositAmount}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Room Configuration Breakdown */}
                    <View style={styles.specGrid}>
                      <View style={styles.specTile}>
                        <View style={styles.specTileTop}>
                          <Feather name="grid" size={Typography.iconSize.sm} color={Palette.accentText} />
                          <Text style={styles.specTileLabel}>Rooms</Text>
                        </View>
                        <Text style={styles.specTileValue}>
                          {specs.roomsCount} {specs.roomsCount === 1 ? 'Room' : 'Rooms'}
                        </Text>
                      </View>

                      <View style={styles.specTile}>
                        <View style={styles.specTileTop}>
                          <Feather name="droplet" size={Typography.iconSize.sm} color={Palette.accentText} />
                          <Text style={styles.specTileLabel}>Bathrooms</Text>
                        </View>
                        <Text style={styles.specTileValue}>
                          {specs.bathrooms} {specs.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
                        </Text>
                      </View>

                      <View style={styles.specTile}>
                        <View style={styles.specTileTop}>
                          <Feather name="sun" size={Typography.iconSize.sm} color={Palette.accentText} />
                          <Text style={styles.specTileLabel}>Balconies</Text>
                        </View>
                        <Text style={styles.specTileValue}>
                          {specs.balconies} {specs.balconies === 1 ? 'Balcony' : 'Balconies'}
                        </Text>
                      </View>

                      <View style={styles.specTile}>
                        <View style={styles.specTileTop}>
                          <Feather name="maximize-2" size={Typography.iconSize.sm} color={Palette.accentText} />
                          <Text style={styles.specTileLabel}>Area</Text>
                        </View>
                        <Text style={styles.specTileValue}>{specs.areaSqFt}</Text>
                      </View>
                    </View>

                    <View style={styles.detailMetaList}>
                      <View style={styles.detailMetaRow}>
                        <View style={styles.detailMetaLeft}>
                          <Feather name="package" size={Typography.iconSize.sm} color={Palette.primary} />
                          <Text style={styles.detailMetaLabel}>Furnishing Status</Text>
                        </View>
                        <Text style={styles.detailMetaValue}>{specs.furnished}</Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.detailMetaRow}>
                        <View style={styles.detailMetaLeft}>
                          <Feather name="users" size={Typography.iconSize.sm} color={Palette.primary} />
                          <Text style={styles.detailMetaLabel}>Booking Type</Text>
                        </View>
                        <Text style={styles.detailMetaValue}>
                          {activeRoom.bookingType || (isVacant ? 'Available' : 'Resident')}
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.detailMetaRow}>
                        <View style={styles.detailMetaLeft}>
                          <Feather name="calendar" size={Typography.iconSize.sm} color={Palette.primary} />
                          <Text style={styles.detailMetaLabel}>Room Joined</Text>
                        </View>
                        <Text style={styles.detailMetaValue}>
                          {activeRoom.joinedDate || 'Not occupied yet'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Furniture & Appliances Card */}
                  <View style={styles.detailsCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>FURNITURE & FIXTURES</Text>
                      <Text style={styles.cardHeaderCount}>{specs.furnishings.length} Items</Text>
                    </View>
                    <View style={styles.furnitureGrid}>
                      {specs.furnishings.map((item) => (
                        <View key={item} style={styles.furnitureChip}>
                          <Feather name="check" size={Typography.iconSize.sm} color={Palette.accentText} />
                          <Text style={styles.furnitureChipText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Room Members Card */}
                  <View style={styles.detailsCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHeaderTitle}>
                        ROOM MEMBERS ({activeRoom.members.length})
                      </Text>
                    </View>

                    {activeRoom.members.length === 0 ? (
                      <View style={styles.emptyMembersCard}>
                        <Feather name="users" size={Typography.iconSize.lg} color={Palette.primary} />
                        <Text style={styles.emptyMembersTitle}>No Residents Assigned</Text>
                        <Text style={styles.emptyMembersSub}>
                          This room is vacant and ready to be booked for Family or Bachelor stay.
                        </Text>
                        <TouchableOpacity
                          style={styles.assignResidentBtn}
                          activeOpacity={0.85}
                          onPress={() => handleOpenBook(activeRoom, 'details')}
                        >
                          <Text style={styles.assignResidentBtnText}>Book Room</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      activeRoom.members.map((member) => (
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
                              <Text style={styles.memberPhone}>{member.phone}</Text>
                              {member.documentName ? (
                                <View style={styles.memberDocPill}>
                                  <Feather name="file-text" size={Typography.iconSize.sm} color={Palette.accentText} />
                                  <Text style={styles.memberDocPillText} numberOfLines={1}>
                                    {member.documentName}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            <View style={styles.memberActionsRow}>
                              <TouchableOpacity
                                style={styles.memberCallBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={() => setStatusNotice(`Dialing ${member.name} (${member.phone})`)}
                              >
                                <Feather name="phone" size={Typography.iconSize.base} color={Palette.accentText} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.memberDeleteBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={() => handleRequestDeleteMember(member)}
                              >
                                <Feather name="trash-2" size={Typography.iconSize.base} color={Palette.status.overdue.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Bottom Page Actions */}
                  <View style={styles.bottomActionsRow}>
                    <TouchableOpacity
                      style={styles.deleteRoomButton}
                      onPress={() => handleRequestDeleteRoom(activeRoom)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.deleteRoomButtonText}>Delete Room</Text>
                    </TouchableOpacity>

                    {isVacant ? (
                      <TouchableOpacity
                        style={styles.primaryFooterBtn}
                        onPress={() => handleOpenBook(activeRoom, 'details')}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.primaryFooterBtnText}>Book Room</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </>
              );
            })()
          ) : effectiveScreen === 'book' && activeRoom ? (
            /* --- SEPARATE PAGE: BOOK ROOM (FAMILY / BACHELOR) --- */
            (() => {
              const specs = getRoomSpecs(activeRoom);

              return (
                <>
                  <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                      <TouchableOpacity
                        style={styles.backButtonCircle}
                        onPress={() => {
                          setBookingError(null);
                          setActiveScreen(bookReturnScreen);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
                      </TouchableOpacity>
                      <View>
                        <Text style={styles.headerTitle}>Book {activeRoom.roomNumber}</Text>
                        <Text style={styles.headerSubtitle}>
                          {activeRoom.wing} · {activeRoom.type}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Room Summary Banner */}
                  <View style={styles.bookRoomBanner}>
                    <Text style={styles.bookRoomBannerTitle}>
                      {activeRoom.roomNumber} · {activeRoom.type}
                    </Text>
                    <Text style={styles.bookRoomBannerSub}>
                      {specs.roomsCount} Rooms · {specs.bathrooms} Bath · {specs.balconies} Balcony · {specs.furnished}
                    </Text>
                    <View style={styles.bookRoomPriceRow}>
                      <Text style={styles.bookRoomPriceText}>
                        Rent: {activeRoom.monthlyRent}/mo · Deposit: {activeRoom.depositAmount}
                      </Text>
                    </View>
                  </View>

                  {/* Booking Type Selector: Family vs Bachelor */}
                  <Text style={styles.inputLabel}>Booking Type *</Text>
                  <View style={styles.bookingTypeRow}>
                    <TouchableOpacity
                      style={[
                        styles.bookingTypeCard,
                        bookingType === 'Family' && styles.bookingTypeCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setBookingType('Family');
                        setBookingError(null);
                      }}
                    >
                      <View style={styles.bookingTypeTopRow}>
                        <Feather
                          name="users"
                          size={Typography.iconSize.base}
                          color={bookingType === 'Family' ? Palette.onPrimary : Palette.accentText}
                        />
                        <Text
                          style={[
                            styles.bookingTypeTitle,
                            bookingType === 'Family' && styles.bookingTypeTitleActive,
                          ]}
                        >
                          Family
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.bookingTypeSub,
                          bookingType === 'Family' && styles.bookingTypeSubActive,
                        ]}
                      >
                        2 Members · Docs & Photos
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bookingTypeCard,
                        bookingType === 'Bachelor' && styles.bookingTypeCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setBookingType('Bachelor');
                        setBookingError(null);
                      }}
                    >
                      <View style={styles.bookingTypeTopRow}>
                        <Feather
                          name="user"
                          size={Typography.iconSize.base}
                          color={bookingType === 'Bachelor' ? Palette.onPrimary : Palette.accentText}
                        />
                        <Text
                          style={[
                            styles.bookingTypeTitle,
                            bookingType === 'Bachelor' && styles.bookingTypeTitleActive,
                          ]}
                        >
                          Bachelor
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.bookingTypeSub,
                          bookingType === 'Bachelor' && styles.bookingTypeSubActive,
                        ]}
                      >
                        1 Resident · Doc & Photo
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Member Forms: 2 members for Family, 1 member for Bachelor */}
                  {renderMemberBookingCard(0)}
                  {bookingType === 'Family' ? renderMemberBookingCard(1) : null}

                  {bookingError ? (
                    <View style={styles.errorBanner}>
                      <Feather name="alert-circle" size={Typography.iconSize.sm} color={Palette.status.overdue.text} />
                      <Text style={styles.errorBannerText}>{bookingError}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.submitBookingBtn}
                    activeOpacity={0.85}
                    onPress={handleConfirmBooking}
                  >
                    <Text style={styles.submitBookingBtnText}>Confirm Booking</Text>
                  </TouchableOpacity>
                </>
              );
            })()
          ) : (
            /* --- MAIN PAGE: FLOOR LIST -> ROOM TYPES IN FLOOR -> ROOMS BY FLOOR & TYPE --- */
            <>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    style={styles.backButtonCircle}
                    onPress={
                      selectedRoomType
                        ? () => {
                            setSelectedRoomType(null);
                            setExpandedRoomId(null);
                            setStatusNotice(null);
                          }
                        : selectedFloor
                          ? () => {
                              setSelectedFloor(null);
                              setExpandedRoomId(null);
                              setStatusNotice(null);
                            }
                          : onBack
                    }
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.headerTitle}>
                      {selectedRoomType || selectedFloor || 'Rooms'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                      {selectedRoomType && selectedFloor
                        ? `${selectedFloor} · ${currentTypeRooms.length} ${currentTypeRooms.length === 1 ? 'Unit' : 'Units'}`
                        : selectedFloor
                          ? `${currentFloorRooms.length} ${currentFloorRooms.length === 1 ? 'Unit' : 'Units'}`
                          : `${rooms.length} ${rooms.length === 1 ? 'Unit' : 'Units'} · ${displayFloors.length} ${displayFloors.length === 1 ? 'Floor' : 'Floors'}`}
                    </Text>
                  </View>
                </View>
              </View>

              {statusNotice ? (
                <View style={styles.noticeBanner}>
                  <Text style={styles.noticeBannerText}>{statusNotice}</Text>
                  <TouchableOpacity onPress={() => setStatusNotice(null)}>
                    <Text style={styles.noticeDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {selectedFloor === null ? (
                /* --- VIEW 1: FLOORS LIST --- */
                <>
                  <View style={styles.typesSectionHeaderRow}>
                    <Text style={styles.sectionTitle}>SELECT FLOOR</Text>
                    <Text style={styles.sectionCountText}>
                      {totalOccupiedCount} Occupied · {totalVacantCount} Vacant
                    </Text>
                  </View>

                  {displayFloors.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Feather name="layers" size={Typography.iconSize.lg} color={Palette.primary} />
                      <Text style={styles.emptyCardTitle}>No Floors Configured</Text>
                      <Text style={styles.emptyCardSub}>
                        Add floors and rooms in Settings to manage them here.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.roomsCard}>
                      {displayFloors.map((floorName, index) => {
                        const isLast = index === displayFloors.length - 1;
                        const matching = rooms.filter((r) =>
                          matchesFloorName(getRoomFloor(r), floorName)
                        );
                        const occupied = matching.filter(
                          (r) => r.status === 'Occupied' || r.status === 'Rent due'
                        ).length;
                        const vacant = matching.filter((r) => r.status === 'Vacant').length;

                        return (
                          <View key={floorName}>
                            <TouchableOpacity
                              style={styles.roomTypeItem}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedFloor(floorName);
                                setSelectedRoomType(null);
                                setFilter('All');
                                setExpandedRoomId(null);
                              }}
                            >
                              <View style={styles.roomTypeLeft}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.roomTypeTitle}>{floorName}</Text>
                                  <Text style={styles.roomTypeSubtitle}>
                                    {matching.length} {matching.length === 1 ? 'Unit' : 'Units'} · {occupied} Occupied · {vacant} Vacant
                                  </Text>
                                </View>
                              </View>

                              <Feather name="chevron-right" size={Typography.iconSize.base} color={Palette.primary} />
                            </TouchableOpacity>

                            {!isLast && <View style={styles.divider} />}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : selectedRoomType === null ? (
                /* --- VIEW 2: ROOM TYPES ON SELECTED FLOOR --- */
                <>
                  <View style={styles.typesSectionHeaderRow}>
                    <Text style={styles.sectionTitle}>SELECT ROOM TYPE</Text>
                    <Text style={styles.sectionCountText}>
                      {floorOccupiedCount} Occupied · {floorVacantCount} Vacant
                    </Text>
                  </View>

                  {floorRoomTypes.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Feather name="home" size={Typography.iconSize.lg} color={Palette.primary} />
                      <Text style={styles.emptyCardTitle}>No Rooms on {selectedFloor}</Text>
                      <Text style={styles.emptyCardSub}>
                        Add rooms for {selectedFloor} in Settings to view room types here.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.roomsCard}>
                      {floorRoomTypes.map((type, index) => {
                        const isLast = index === floorRoomTypes.length - 1;
                        const matching = currentFloorRooms.filter((r) =>
                          matchesRoomType(r.type, type)
                        );
                        const occupied = matching.filter(
                          (r) => r.status === 'Occupied' || r.status === 'Rent due'
                        ).length;
                        const vacant = matching.filter((r) => r.status === 'Vacant').length;

                        return (
                          <View key={type}>
                            <TouchableOpacity
                              style={styles.roomTypeItem}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedRoomType(type);
                                setFilter('All');
                                setExpandedRoomId(null);
                              }}
                            >
                              <View style={styles.roomTypeLeft}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.roomTypeTitle}>{type}</Text>
                                  <Text style={styles.roomTypeSubtitle}>
                                    {matching.length} {matching.length === 1 ? 'Unit' : 'Units'} · {occupied} Occupied · {vacant} Vacant
                                  </Text>
                                </View>
                              </View>

                              <Feather name="chevron-right" size={Typography.iconSize.base} color={Palette.primary} />
                            </TouchableOpacity>

                            {!isLast && <View style={styles.divider} />}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                /* --- VIEW 3: ROOMS OF SELECTED TYPE ON SELECTED FLOOR --- */
                <>
                  <View style={styles.filterRow}>
                    <TouchableOpacity
                      style={[styles.filterPill, filter === 'All' && styles.filterPillActive]}
                      onPress={() => {
                        setFilter('All');
                        setExpandedRoomId(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterPillText, filter === 'All' && styles.filterPillTextActive]}>
                        All ({currentTypeRooms.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.filterPill, filter === 'Occupied' && styles.filterPillActive]}
                      onPress={() => {
                        setFilter('Occupied');
                        setExpandedRoomId(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          filter === 'Occupied' && styles.filterPillTextActive,
                        ]}
                      >
                        Occupied ({typeOccupiedCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.filterPill, filter === 'Vacant' && styles.filterPillActive]}
                      onPress={() => {
                        setFilter('Vacant');
                        setExpandedRoomId(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterPillText, filter === 'Vacant' && styles.filterPillTextActive]}>
                        Vacant ({typeVacantCount})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {filteredRooms.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Feather name="home" size={Typography.iconSize.lg} color={Palette.primary} />
                      <Text style={styles.emptyCardTitle}>No {filter === 'All' ? '' : filter} Rooms</Text>
                      <Text style={styles.emptyCardSub}>
                        No {filter.toLowerCase()} {selectedRoomType} rooms found on {selectedFloor}.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.roomsCard}>
                      {filteredRooms.map((room, index) => {
                        const isLast = index === filteredRooms.length - 1;
                        const isExpanded = expandedRoomId === room.id;
                        const isOccupied = room.status === 'Occupied';
                        const isRentDue = room.status === 'Rent due';
                        const isVacant = room.status === 'Vacant';
                        const primaryMember = room.members[0];
                        const specs = getRoomSpecs(room);
                        const tenantSummary = isVacant
                          ? `Vacant · ${room.monthlyRent}`
                          : `${primaryMember ? primaryMember.name : 'Resident'} · ${room.monthlyRent}`;

                        return (
                          <View key={room.id}>
                            {isExpanded ? (
                              <View style={styles.expandedRoomBox}>
                                <TouchableOpacity
                                  style={styles.expandedHeaderRow}
                                  activeOpacity={0.75}
                                  onPress={() => setExpandedRoomId(null)}
                                >
                                  <View style={styles.roomInfo}>
                                    <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                                    <Text style={styles.tenantInfoText}>
                                      {room.wing} · {room.type}
                                    </Text>
                                  </View>

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

                                <View style={styles.expandedSpecsBlock}>
                                  <View style={styles.expandedSpecRow}>
                                    <View style={styles.expandedSpecLeft}>
                                      <Feather name="grid" size={Typography.iconSize.sm} color={Palette.primary} />
                                      <Text style={styles.expandedSpecLabel}>Configuration</Text>
                                    </View>
                                    <Text style={styles.expandedSpecValue}>
                                      {specs.roomsCount} Rooms · {specs.bathrooms} Bath · {specs.balconies} Balcony
                                    </Text>
                                  </View>

                                  <View style={styles.expandedSpecRow}>
                                    <View style={styles.expandedSpecLeft}>
                                      <Feather name="package" size={Typography.iconSize.sm} color={Palette.primary} />
                                      <Text style={styles.expandedSpecLabel}>Furnishing</Text>
                                    </View>
                                    <Text style={styles.expandedSpecValue}>{specs.furnished}</Text>
                                  </View>

                                  <View style={styles.expandedSpecRow}>
                                    <View style={styles.expandedSpecLeft}>
                                      <Feather name="credit-card" size={Typography.iconSize.sm} color={Palette.primary} />
                                      <Text style={styles.expandedSpecLabel}>Rent & Deposit</Text>
                                    </View>
                                    <Text style={styles.expandedSpecValue}>
                                      {room.monthlyRent} · {room.depositAmount}
                                    </Text>
                                  </View>
                                </View>

                                {/* Actions Inside Same Container: 1st View Details, 2nd Book (if Vacant) */}
                                <View style={styles.expandedActionsRow}>
                                  <TouchableOpacity
                                    style={
                                      isVacant ? styles.expandedSecondaryBtn : styles.expandedPrimaryBtn
                                    }
                                    activeOpacity={0.75}
                                    onPress={() => handleOpenDetails(room)}
                                  >
                                    <Text
                                      style={
                                        isVacant
                                          ? styles.expandedSecondaryBtnText
                                          : styles.expandedPrimaryBtnText
                                      }
                                    >
                                      View Details
                                    </Text>
                                  </TouchableOpacity>

                                  {isVacant ? (
                                    <TouchableOpacity
                                      style={styles.expandedPrimaryBtn}
                                      activeOpacity={0.85}
                                      onPress={() => handleOpenBook(room, 'main')}
                                    >
                                      <Text style={styles.expandedPrimaryBtnText}>Book</Text>
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.roomItem}
                                activeOpacity={0.7}
                                onPress={() => setExpandedRoomId(room.id)}
                              >
                                <View style={styles.roomInfo}>
                                  <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                                  <Text style={styles.tenantInfoText}>{tenantSummary}</Text>
                                </View>

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
                            )}

                            {!isLast && <View style={styles.divider} />}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Booking Confirmed Modal */}
      <Modal
        visible={bookingReceipt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBookingReceipt(null);
          setActiveScreen('details');
        }}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalBackdrop} />
          {bookingReceipt ? (
            <View style={styles.receiptModalCard}>
              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => {
                  setBookingReceipt(null);
                  setActiveScreen('details');
                }}
              >
                <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
              </TouchableOpacity>

              <View style={styles.receiptSuccessCircle}>
                <Feather name="check" size={Typography.iconSize.lg} color={Palette.onPrimary} />
              </View>

              <Text style={styles.receiptTitle}>Room Booked</Text>
              <Text style={styles.receiptMessage}>
                {bookingReceipt.roomNumber} has been booked under {bookingReceipt.bookingType} occupancy.
              </Text>

              <View style={styles.receiptSummaryBox}>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Room</Text>
                  <Text style={styles.receiptSummaryValue}>
                    {bookingReceipt.roomNumber} ({bookingReceipt.type})
                  </Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Booking Type</Text>
                  <Text style={styles.receiptSummaryValue}>{bookingReceipt.bookingType}</Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Members</Text>
                  <Text style={styles.receiptSummaryValue}>
                    {bookingReceipt.memberNames.join(', ')}
                  </Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Monthly Rent</Text>
                  <Text style={styles.receiptSummaryValue}>{bookingReceipt.monthlyRent}</Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Move-in Date</Text>
                  <Text style={styles.receiptSummaryValue}>{bookingReceipt.joinedDate}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.receiptDoneBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setBookingReceipt(null);
                  setActiveScreen('details');
                }}
              >
                <Text style={styles.receiptDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Destructive Action Confirmation Modal (Cross-platform Web + Native) */}
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
    fontFamily: Typography.fontFamily.serif,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 2,
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
  typesSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
  },
  sectionCountText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  roomTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  roomTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomTypeTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  roomTypeSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyCardSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  filterPillTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  roomsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  tenantInfoText: {
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.caption,
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
    backgroundColor: Palette.divider,
  },
  expandedRoomBox: {
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginVertical: 8,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedSpecsBlock: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    paddingTop: 10,
    gap: 8,
    marginBottom: 14,
  },
  expandedSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedSpecLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedSpecLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  expandedSpecValue: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  expandedSecondaryBtn: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSecondaryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.accentText,
  },
  expandedPrimaryBtn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedPrimaryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  detailsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
  },
  detailsBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  detailsBannerSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  financialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  financialBox: {
    flex: 1,
    backgroundColor: Palette.tint,
    borderRadius: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  finLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 3,
  },
  finValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.text,
  },
  financialEditCard: {
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Palette.accentText,
    padding: 14,
    marginBottom: 14,
  },
  financialEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  financialEditTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.accentText,
  },
  financialEditRow: {
    flexDirection: 'row',
    gap: 12,
  },
  financialEditCol: {
    flex: 1,
  },
  finInputLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  financialInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: Typography.fontSize.base,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  financialCancelText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  financialSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 5,
    backgroundColor: Palette.primary,
  },
  financialSaveText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  specTile: {
    width: '48%',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  specTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  specTileLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  specTileValue: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '700',
  },
  detailMetaList: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  detailMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailMetaValue: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
  },
  cardHeaderCount: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  furnitureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  furnitureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  furnitureChipText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  emptyMembersCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  emptyMembersTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyMembersSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  assignResidentBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 5,
  },
  assignResidentBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  memberCard: {
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 10,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarInitial: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.accentText,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.pill,
  },
  memberInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  memberName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  memberRole: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  memberPhone: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  memberDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  memberDocPillText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    fontWeight: '600',
  },
  memberActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteRoomButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 5,
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  deleteRoomButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  primaryFooterBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 5,
    backgroundColor: Palette.primary,
  },
  primaryFooterBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  bookRoomBanner: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 14,
  },
  bookRoomBannerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  bookRoomBannerSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  bookRoomPriceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  bookRoomPriceText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.accentText,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 10,
  },
  bookingTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  bookingTypeCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
  },
  bookingTypeCardActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  bookingTypeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bookingTypeTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  bookingTypeTitleActive: {
    color: Palette.onPrimary,
  },
  bookingTypeSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  bookingTypeSubActive: {
    color: Palette.onPrimary,
  },
  memberFormCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 16,
    marginBottom: 14,
  },
  memberFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  memberFormBadge: {
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberFormBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
  },
  memberFormTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  inputField: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderStyle: 'dashed',
    borderRadius: 5,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.tint,
    marginTop: 2,
  },
  uploadBoxText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.accentText,
    marginTop: 6,
  },
  uploadBoxSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  sampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sampleRowLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  sampleDocChip: {
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sampleDocChipText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.accentText,
    fontWeight: '600',
  },
  sampleAvatarThumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sampleAvatarThumb: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
  },
  uploadedPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    padding: 10,
    marginTop: 2,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  uploadedAvatar: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
  },
  photoUploadedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  changePhotoText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.accentText,
    fontWeight: '600',
    marginTop: 2,
  },
  uploadedDocContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    padding: 12,
    marginTop: 2,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 10,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  docFileName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.status.overdue.text,
    fontWeight: '600',
  },
  submitBookingBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  submitBookingBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
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
  receiptModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 22,
    alignItems: 'center',
  },
  receiptCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptSuccessCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.occupied.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  receiptTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
    fontFamily: Typography.fontFamily.serif,
    marginBottom: 6,
  },
  receiptMessage: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  receiptSummaryBox: {
    width: '100%',
    backgroundColor: Palette.status.occupied.bg,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    gap: 8,
    marginBottom: 18,
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  receiptSummaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  receiptSummaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
  },
  receiptDoneBtn: {
    width: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDoneBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
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
