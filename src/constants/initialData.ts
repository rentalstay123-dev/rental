import type {
  NotificationItem,
  OwnerProfile,
  RoomItem,
  RoomRentMeta,
  StaffMember,
  TransactionItem,
  WorkspaceSettings,
} from '../types/appData';

export const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
];

export const SAMPLE_DOCUMENTS = [
  'Aadhaar_ID_Proof.pdf',
  'PAN_Verification.pdf',
  'Passport_Copy.pdf',
];

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

export const DEFAULT_STAFF_ROLES: string[] = [
  'Security Guard',
  'Housekeeping',
  'Maintenance',
  'Caretaker',
  'Plumber',
  'Electrician',
];

export const INITIAL_STAFF: StaffMember[] = [];

export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  fullName: '',
  email: '',
  phone: '',
  propertyName: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  ifscCode: '',
  biometricEnabled: false,
  alertsEnabled: true,
};

export const DEFAULT_ROOM_TYPE_FINANCIALS: Record<string, { rent: string; deposit: string }> = {
  '1 BHK': { rent: '₹0', deposit: '₹0' },
  '2 BHK': { rent: '₹0', deposit: '₹0' },
  '3 BHK': { rent: '₹0', deposit: '₹0' },
  'Studio / 1 RK': { rent: '₹0', deposit: '₹0' },
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  floors: INITIAL_FLOORS,
  roomTypes: INITIAL_ROOM_TYPES,
  roomTypeDefaults: DEFAULT_ROOM_TYPE_FINANCIALS,
  maintenanceReasons: INITIAL_MAINTENANCE_REASONS,
  rentCycleDay: '1st of month',
  gracePeriod: '5 days',
  lateFee: '₹500',
  autoReminder: true,
  maintenanceNotify: true,
};

export const INITIAL_ROOMS: RoomItem[] = [];

export function createInitialRentMeta(now: Date = new Date()): Record<string, RoomRentMeta> {
  return {};
}

export function createInitialTransactions(now: Date = new Date()): TransactionItem[] {
  return [];
}

export function createInitialNotifications(now: Date = new Date()): NotificationItem[] {
  return [];
}
