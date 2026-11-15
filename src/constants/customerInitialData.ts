import type {
  CustomerNotice,
  CustomerServiceRequest,
  CustomerWorkspaceData,
  RoomDepositOverride,
  RoomItem,
  RoomRentMeta,
} from '../types/appData';
import { formatShortDate, MONTHS_SHORT, parseRupeeAmount } from '../utils/finance';
import {
  createInitialRentMeta,
  DEFAULT_OWNER_PROFILE,
  DEFAULT_WORKSPACE_SETTINGS,
  INITIAL_ROOMS,
  INITIAL_STAFF,
} from './initialData';

function cloneRoom(room: RoomItem): RoomItem {
  return {
    ...room,
    furnishings: room.furnishings ? [...room.furnishings] : undefined,
    members: room.members.map((m) => ({ ...m })),
  };
}

function findInitialRoomByNumber(roomNumber?: string): RoomItem {
  if (roomNumber && roomNumber.trim()) {
    const normalized = roomNumber.trim().toLowerCase();
    const match = INITIAL_ROOMS.find(
      (r) =>
        r.roomNumber.toLowerCase() === normalized ||
        r.roomNumber.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '') ||
        r.roomNumber.replace(/[^0-9]/g, '') === normalized.replace(/[^0-9]/g, '')
    );
    if (match) return cloneRoom(match);
  }
  // Default to Room 102 (active due bill + rich history & furnishings)
  const fallback = INITIAL_ROOMS.find((r) => r.id === '2') ?? INITIAL_ROOMS[0];
  return cloneRoom(fallback);
}

export function createInitialCustomerRequests(
  now: Date = new Date(),
  roomNumber: string = 'Room 102'
): CustomerServiceRequest[] {
  const ts = now.getTime();
  return [
    {
      id: 'creq-1',
      category: 'Plumbing',
      title: 'Kitchen sink tap dripping',
      description: `Slow drip from the cold water valve in ${roomNumber} kitchen sink. Needs washer replacement.`,
      priority: 'Normal',
      status: 'In Progress',
      createdAt: ts - 5 * 60 * 60 * 1000,
      timeLabel: '5h ago',
      assignedTo: `${INITIAL_STAFF[2]?.name ?? 'Suresh Shetty'} · Maintenance`,
      ownerNote: 'Scheduled for inspection today between 4:00 PM and 6:00 PM.',
    },
    {
      id: 'creq-2',
      category: 'Electrical',
      title: 'Balcony light fixture flicker',
      description: 'LED tube in balcony flickers occasionally when switched on at night.',
      priority: 'Normal',
      status: 'Resolved',
      createdAt: ts - 6 * 24 * 60 * 60 * 1000,
      timeLabel: '6d ago',
      assignedTo: `${INITIAL_STAFF[2]?.name ?? 'Suresh Shetty'} · Maintenance`,
      ownerNote: 'Replaced starter and LED tube. Marked resolved.',
    },
  ];
}

export function createInitialCustomerNotices(
  now: Date = new Date(),
  roomNumber: string = 'Room 102',
  rentStatus: RoomRentMeta['currentStatus'] = 'Due',
  rentAmount: string = '₹15,000',
  dueDateLabel: string = formatShortDate(now)
): CustomerNotice[] {
  const ts = now.getTime();
  const billingNotice: CustomerNotice =
    rentStatus === 'Paid'
      ? {
          id: 'cnot-1',
          category: 'Billing',
          title: 'Monthly Rent Paid',
          message: `Your rent of ${rentAmount} for ${roomNumber} has been marked as paid. Thank you!`,
          timeLabel: 'Today',
          createdAt: ts - 60 * 60 * 1000,
          isRead: false,
        }
      : {
          id: 'cnot-1',
          category: 'Billing',
          title: `Rent Due Reminder · ${roomNumber}`,
          message: `Monthly rent of ${rentAmount} is due by ${dueDateLabel}. Pay via UPI or bank transfer to avoid late fee.`,
          timeLabel: '2h ago',
          createdAt: ts - 2 * 60 * 60 * 1000,
          isRead: false,
        };

  return [
    billingNotice,
    {
      id: 'cnot-2',
      category: 'Maintenance',
      title: 'Water Tank Cleaning Schedule',
      message:
        'Overhead water tank cleaning is scheduled this Sunday from 10:00 AM to 1:00 PM. Please store water in advance.',
      timeLabel: 'Yesterday',
      createdAt: ts - 24 * 60 * 60 * 1000,
      isRead: false,
    },
    {
      id: 'cnot-3',
      category: 'Property',
      title: 'Visitor Parking & Gate Security',
      message:
        'Please register overnight guest vehicles with night security (Ramesh Naik) at the main gate.',
      timeLabel: '4d ago',
      createdAt: ts - 4 * 24 * 60 * 60 * 1000,
      isRead: true,
    },
  ];
}

export function createInitialCustomerData(hints?: {
  email?: string;
  fullName?: string;
  roomNumber?: string;
  propertyName?: string;
}): CustomerWorkspaceData {
  const now = new Date();
  const room = findInitialRoomByNumber(hints?.roomNumber);

  // If user registered with a custom room number not in sample list, reflect that room number cleanly
  const customRoomNumber = hints?.roomNumber?.trim();
  if (
    customRoomNumber &&
    room.roomNumber.toLowerCase() !== customRoomNumber.toLowerCase() &&
    !INITIAL_ROOMS.some(
      (r) => r.roomNumber.replace(/[^0-9]/g, '') === customRoomNumber.replace(/[^0-9]/g, '')
    )
  ) {
    room.roomNumber = /^room\s+/i.test(customRoomNumber)
      ? `Room ${customRoomNumber.replace(/^room\s+/i, '').trim()}`
      : `Room ${customRoomNumber}`;
  }

  const primaryMember = room.members[0];
  const resolvedName = hints?.fullName?.trim() || primaryMember?.name || 'Priya Sharma';
  const resolvedEmail = hints?.email?.trim() || 'resident@luvora.com';
  const resolvedProperty = hints?.propertyName?.trim() || DEFAULT_OWNER_PROFILE.propertyName;

  if (room.members.length > 0 && hints?.fullName?.trim()) {
    room.members[0] = {
      ...room.members[0],
      name: resolvedName,
    };
  }

  const allRentMeta = createInitialRentMeta(now);
  const currMonthShort = MONTHS_SHORT[now.getMonth()];
  const fallbackDueDate = `1 ${currMonthShort} ${now.getFullYear()}`;
  const rawMeta = allRentMeta[room.id];

  const rentMeta: RoomRentMeta = rawMeta
    ? {
        ...rawMeta,
        history: rawMeta.history.map((h) => ({ ...h })),
      }
    : {
        roomId: room.id,
        maintenanceAmount: '₹2,000',
        advancePayment: '₹0',
        dueDate: fallbackDueDate,
        paymentCycle: 'Monthly',
        currentStatus: room.status === 'Rent due' ? 'Due' : 'Paid',
        statusBadgeText: room.status === 'Rent due' ? `Due ${currMonthShort} 1` : 'Paid',
        history: [],
      };

  const depositNumeric = parseRupeeAmount(room.depositAmount);
  const receivedDate = room.joinedDate || 'Mar 01, 2026';
  const deposit: RoomDepositOverride = {
    roomId: room.id,
    roomNumber: room.roomNumber,
    amount: room.depositAmount,
    numericAmount: depositNumeric,
    deductedAmount: '₹0',
    numericDeducted: 0,
    dateReceived: '',
    paymentMode: 'UPI',
    status: depositNumeric > 0 ? 'Due' : 'No Deposit',
    history: [],
  };

  return {
    profile: {
      fullName: resolvedName,
      email: resolvedEmail,
      phone: primaryMember?.phone || '+91 98765 43210',
      emergencyContactName: room.members[1]?.name || 'Meera Sharma',
      emergencyContactPhone: room.members[1]?.phone || '+91 98765 67890',
      propertyName: resolvedProperty,
      roomNumber: room.roomNumber,
      alertsEnabled: true,
    },
    room,
    rentMeta,
    deposit,
    requests: createInitialCustomerRequests(now, room.roomNumber),
    notices: createInitialCustomerNotices(
      now,
      room.roomNumber,
      rentMeta.currentStatus,
      room.monthlyRent,
      rentMeta.dueDate
    ),
    ownerContact: {
      name: DEFAULT_OWNER_PROFILE.fullName,
      phone: DEFAULT_OWNER_PROFILE.phone,
      email: DEFAULT_OWNER_PROFILE.email,
      caretakerName: INITIAL_STAFF[0]?.name || 'Ramesh Naik',
      caretakerPhone: INITIAL_STAFF[0]?.phone || '+91 98451 22001',
      bankName: DEFAULT_OWNER_PROFILE.bankName,
      accountHolder: DEFAULT_OWNER_PROFILE.accountHolder,
      accountNumber: DEFAULT_OWNER_PROFILE.accountNumber,
      ifscCode: DEFAULT_OWNER_PROFILE.ifscCode,
      upiId: 'luvora.sunrise@hdfcbank',
    },
    leaseInfo: {
      startDate: receivedDate,
      endDate: 'Feb 28, 2027',
      completedMonths: 8,
      totalMonths: 11,
      noticePeriodDays: 30,
      rentCycleDay: DEFAULT_WORKSPACE_SETTINGS.rentCycleDay,
      gracePeriod: DEFAULT_WORKSPACE_SETTINGS.gracePeriod,
      lateFee: DEFAULT_WORKSPACE_SETTINGS.lateFee,
    },
  };
}

