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

export type RentFilter = 'All' | 'Paid' | 'Due';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type RoomRentStatus = 'Paid' | 'Due' | 'Overdue';
export type PaymentMode = 'UPI' | 'Bank Transfer' | 'Cash' | 'Net Banking';

export interface PaymentRecord {
  id: string;
  title: string;
  amount: string;
  date: string;
  status: PaymentStatus;
  method?: string;
}

export interface RoomRentMeta {
  roomId: string;
  maintenanceAmount: string;
  advancePayment: string;
  dueDate: string;
  paymentCycle: string;
  currentStatus: RoomRentStatus;
  statusBadgeText: string;
  history: PaymentRecord[];
}

export interface ResolvedRoomRent {
  id: string;
  roomNumber: string;
  tenantName: string;
  wing: string;
  maintenanceAmount: string;
  monthlyRent: string;
  numericFullRent: number;
  advancePayment: string;
  dueDate: string;
  paymentCycle: string;
  currentStatus: RoomRentStatus;
  statusBadgeText: string;
  history: PaymentRecord[];
}

export type DepositStatus = 'Held' | 'Refunded' | 'No Deposit' | 'Due' | 'Pending' | 'Paid';
export type DepositPaymentMode = 'UPI' | 'Bank Transfer' | 'Cash' | 'Net Banking';

export interface DepositHistoryEntry {
  id: string;
  title: string;
  amount: string;
  date: string;
  mode: DepositPaymentMode | 'Deduction';
  note?: string;
}

export interface RoomDepositOverride {
  roomId?: string;
  roomNumber?: string;
  amount: string;
  numericAmount: number;
  deductedAmount: string;
  numericDeducted: number;
  dateReceived: string;
  dateRefunded?: string;
  paymentMode: DepositPaymentMode;
  status: DepositStatus;
  history: DepositHistoryEntry[];
}

export type TransactionKind = 'income' | 'expense';

export interface TransactionItem {
  id: string;
  kind: TransactionKind;
  title: string;
  subtitle: string;
  amount: string;
  numericAmount: number;
  date: string;
  dateIso: string;
  createdAt: number;
  roomId?: string;
}

export interface NotificationItem {
  id: string;
  type: 'customer' | 'system';
  title: string;
  roomNumber?: string;
  senderName?: string;
  phone?: string;
  tag: string;
  message: string;
  time: string;
  createdAt: number;
  isRead?: boolean;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  assignedStaff?: string;
}

export interface OwnerProfile {
  fullName: string;
  email: string;
  phone: string;
  propertyName: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  biometricEnabled: boolean;
  alertsEnabled: boolean;
}

export interface RoomTypeDefaultFinancials {
  rent: string;
  deposit: string;
}

export interface WorkspaceSettings {
  floors: string[];
  roomTypes: string[];
  roomTypeDefaults?: Record<string, RoomTypeDefaultFinancials>;
  maintenanceReasons: string[];
  rentCycleDay: string;
  gracePeriod: string;
  lateFee: string;
  autoReminder: boolean;
  maintenanceNotify: boolean;
}

export type StaffStatus = 'Active' | 'On Leave';
export type StaffShift = 'Full Day' | 'Morning' | 'Night' | 'On Call';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  salary: string;
  numericSalary: number;
  shift: StaffShift;
  status: StaffStatus;
  joinedDate: string;
  lastPaidDate?: string;
  notes?: string;
}

export type UserRole = 'owner' | 'customer';

export type ServiceRequestStatus = 'Open' | 'In Progress' | 'Resolved';
export type ServiceRequestPriority = 'Normal' | 'Urgent';

export interface CustomerServiceRequest {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  createdAt: number;
  timeLabel: string;
  assignedTo?: string;
  ownerNote?: string;
}

export interface CustomerNotice {
  id: string;
  category: 'Property' | 'Billing' | 'Maintenance';
  title: string;
  message: string;
  timeLabel: string;
  createdAt: number;
  isRead: boolean;
}

export interface CustomerProfile {
  fullName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  propertyName: string;
  roomNumber: string;
  alertsEnabled: boolean;
}

export interface CustomerLeaseInfo {
  startDate: string;
  endDate: string;
  completedMonths: number;
  totalMonths: number;
  noticePeriodDays: number;
  rentCycleDay: string;
  gracePeriod: string;
  lateFee: string;
}

export interface CustomerOwnerContact {
  name: string;
  phone: string;
  email: string;
  caretakerName: string;
  caretakerPhone: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface CustomerWorkspaceData {
  profile: CustomerProfile;
  room: RoomItem;
  rentMeta: RoomRentMeta;
  deposit: RoomDepositOverride;
  requests: CustomerServiceRequest[];
  notices: CustomerNotice[];
  ownerContact: CustomerOwnerContact;
  leaseInfo: CustomerLeaseInfo;
}

