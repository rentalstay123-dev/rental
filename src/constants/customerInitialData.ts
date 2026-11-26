import type {
  CustomerNotice,
  CustomerServiceRequest,
  CustomerWorkspaceData,
  PropertyRule,
  ResidentDocument,
  RoomDepositOverride,
  RoomItem,
  RoomRentMeta,
} from '../types/appData';
import { formatShortDate, MONTHS_SHORT } from '../utils/finance';
import { DEFAULT_WORKSPACE_SETTINGS } from './initialData';

function findInitialRoomByNumber(roomNumber?: string): RoomItem {
  const norm = roomNumber?.trim() || 'Room 101';
  const label = /^room(?:[\s-]+|(?=\d))/i.test(norm)
    ? `Room ${norm.replace(/^room(?:[\s-]+|(?=\d))/i, '').trim()}`
    : `Room ${norm}`;
  return {
    id: 'r-user',
    roomNumber: label,
    wing: 'Floor 1',
    type: '1 BHK',
    monthlyRent: '₹0',
    depositAmount: '₹0',
    joinedDate: formatShortDate(new Date()),
    status: 'Occupied',
    bookingType: 'Family',
    roomsCount: 1,
    bathrooms: 1,
    balconies: 0,
    areaSqFt: '',
    furnished: 'Unfurnished',
    members: [],
  };
}

export function createInitialCustomerRequests(now?: Date, roomNumber?: string): CustomerServiceRequest[] {
  return [];
}

export function createInitialCustomerNotices(
  now?: Date,
  roomNumber?: string,
  rentStatus?: RoomRentMeta['currentStatus'],
  rentAmount?: string,
  dueDateLabel?: string
): CustomerNotice[] {
  return [];
}

export function createInitialCustomerData(hints?: {
  email?: string;
  fullName?: string;
  roomNumber?: string;
  propertyName?: string;
}): CustomerWorkspaceData {
  const now = new Date();
  const room = findInitialRoomByNumber(hints?.roomNumber);

  const resolvedName = hints?.fullName?.trim() || 'Resident';
  const resolvedEmail = hints?.email?.trim() || '';
  const resolvedProperty = hints?.propertyName?.trim() || '';

  const fallbackDueDate = `1 ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;

  const rentMeta: RoomRentMeta = {
    roomId: room.id,
    maintenanceAmount: '₹0',
    advancePayment: '₹0',
    dueDate: fallbackDueDate,
    paymentCycle: 'Monthly',
    currentStatus: 'Paid',
    statusBadgeText: 'Paid',
    history: [],
  };

  const deposit: RoomDepositOverride = {
    roomId: room.id,
    roomNumber: room.roomNumber,
    amount: '₹0',
    numericAmount: 0,
    deductedAmount: '₹0',
    numericDeducted: 0,
    dateReceived: '',
    paymentMode: 'UPI',
    status: 'No Deposit',
    history: [],
  };

  return {
    profile: {
      fullName: resolvedName,
      email: resolvedEmail,
      phone: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      propertyName: resolvedProperty,
      roomNumber: room.roomNumber,
      alertsEnabled: true,
    },
    room,
    rentMeta,
    deposit,
    requests: [],
    notices: [],
    ownerContact: {
      name: resolvedProperty ? `${resolvedProperty} Management` : 'Property Management',
      phone: '',
      email: '',
      caretakerName: '',
      caretakerPhone: '',
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
    leaseInfo: {
      startDate: formatShortDate(now),
      endDate: '',
      completedMonths: 0,
      totalMonths: 11,
      noticePeriodDays: 30,
      rentCycleDay: DEFAULT_WORKSPACE_SETTINGS.rentCycleDay,
      gracePeriod: DEFAULT_WORKSPACE_SETTINGS.gracePeriod,
      lateFee: DEFAULT_WORKSPACE_SETTINGS.lateFee,
    },
    rules: createInitialPropertyRules(),
    documents: [],
  };
}

export function createInitialPropertyRules(): PropertyRule[] {
  return [
    {
      id: 'rule-1',
      category: 'Quiet Hours',
      title: 'Quiet Hours & Noise Discipline',
      summary: 'Maintain low noise levels in rooms, balconies, and corridors between 10:00 PM and 7:00 AM.',
      details: 'Loud music, shouting, musical instrument practice, or high-volume television is strictly prohibited during quiet hours to respect fellow residents.',
      timing: '10:00 PM – 7:00 AM',
      enforcementLevel: 'Mandatory',
    },
    {
      id: 'rule-2',
      category: 'Visitors',
      title: 'Visitor & Guest Regulations',
      summary: 'Day visitors are welcome between 9:00 AM and 9:30 PM. Overnight stays require advance intimation.',
      details: 'All visitors must be logged at the security gate. Overnight guests require prior notice to management or caretaker at least 24 hours in advance.',
      timing: '9:00 AM – 9:30 PM',
      enforcementLevel: 'Standard',
    },
    {
      id: 'rule-3',
      category: 'Security',
      title: 'Building Security & Entry Access',
      summary: 'Main building gate locks automatically at 11:00 PM. Do not duplicate physical keys or tamper with biometric locks.',
      details: 'Late returns after 11:00 PM must inform the on-duty caretaker. Duplication of room keys without owner approval is strictly prohibited for security integrity.',
      timing: 'Gate locks at 11:00 PM',
      enforcementLevel: 'Mandatory',
    },
    {
      id: 'rule-4',
      category: 'Cleanliness',
      title: 'Waste Segregation & Cleanliness',
      summary: 'Segregate wet and dry garbage. Corridors and common areas must be kept clean and hazard-free.',
      details: 'Trash bags must be tied and deposited in designated floor collection bins before 9:00 AM. Do not leave footwear or personal boxes in shared passages.',
      timing: 'Daily collection: 8:30 AM',
      enforcementLevel: 'Standard',
    },
    {
      id: 'rule-5',
      category: 'General',
      title: 'Smoke-Free & Substance Policy',
      summary: 'Smoking, vaping, and banned substances are strictly forbidden inside premises.',
      details: 'Zero tolerance for narcotics and hazardous inflammable materials. Smoking is strictly disallowed in rooms, washrooms, balconies, and stairways.',
      enforcementLevel: 'Mandatory',
    },
    {
      id: 'rule-6',
      category: 'General',
      title: 'Electrical Safety & Appliance Usage',
      summary: 'Ensure geysers, air conditioners, and cooking induction tops are powered off when leaving the room.',
      details: 'High-power room heaters or unauthorized wiring modifications are not allowed. Report any spark or switchboard fault immediately via service request.',
      enforcementLevel: 'Guideline',
    },
  ];
}

export function createInitialResidentDocuments(roomNumber?: string): ResidentDocument[] {
  return [];
}

