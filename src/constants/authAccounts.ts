import type { UserRole } from '../types/appData';

export interface BuiltInPortalAccount {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
  localUid: string;
  propertyName: string;
  roomNumber?: string;
}

export const BUILT_IN_PORTAL_ACCOUNTS: BuiltInPortalAccount[] = [
  {
    email: 'admin123@gmail.com',
    password: 'Admin@2026',
    role: 'owner',
    displayName: 'Rajesh Sharma',
    localUid: 'local-admin-123',
    propertyName: 'Sunrise Apartments, Mangalore',
  },
  {
    email: 'customer123@gmail.com',
    password: 'Customer@2026',
    role: 'customer',
    displayName: 'Priya Sharma',
    localUid: 'local-customer-123',
    propertyName: 'Sunrise Apartments, Mangalore',
    roomNumber: 'Room 102',
  },
];

export const LOCAL_SESSION_STORAGE_KEY = '@luvora_local_session';

export function matchBuiltInAccount(
  email: string,
  password: string
): BuiltInPortalAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return BUILT_IN_PORTAL_ACCOUNTS.find(
    (acct) => acct.email.toLowerCase() === normalizedEmail && acct.password === password
  );
}

export function getBuiltInRoleByEmail(email?: string | null): UserRole | null {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const match = BUILT_IN_PORTAL_ACCOUNTS.find(
    (acct) => acct.email.toLowerCase() === normalizedEmail
  );
  return match?.role ?? null;
}

