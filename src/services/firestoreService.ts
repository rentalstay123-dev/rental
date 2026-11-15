import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  createInitialNotifications,
  createInitialRentMeta,
  createInitialTransactions,
  DEFAULT_OWNER_PROFILE,
  DEFAULT_WORKSPACE_SETTINGS,
  INITIAL_ROOMS,
  INITIAL_STAFF,
} from '../constants/initialData';
import {
  createInitialCustomerData,
} from '../constants/customerInitialData';
import type {
  CustomerWorkspaceData,
  NotificationItem,
  OwnerProfile,
  RoomDepositOverride,
  RoomItem,
  RoomRentMeta,
  StaffMember,
  TransactionItem,
  UserRole,
  WorkspaceSettings,
} from '../types/appData';

export interface WorkspaceSnapshot {
  profile: OwnerProfile;
  settings: WorkspaceSettings;
  rooms: RoomItem[];
  rentMetaByRoomId: Record<string, RoomRentMeta>;
  depositOverrides: Record<string, RoomDepositOverride>;
  transactions: TransactionItem[];
  notifications: NotificationItem[];
}

export interface WorkspaceCallbacks {
  onWorkspaceDoc: (profile: OwnerProfile, settings: WorkspaceSettings) => void;
  onRooms: (rooms: RoomItem[]) => void;
  onRentMeta: (rentMetaByRoomId: Record<string, RoomRentMeta>) => void;
  onDeposits: (depositOverrides: Record<string, RoomDepositOverride>) => void;
  onTransactions: (transactions: TransactionItem[]) => void;
  onNotifications: (notifications: NotificationItem[]) => void;
  onStaff: (staff: StaffMember[]) => void;
  onError?: (error: unknown) => void;
}

/** Recursively strips `undefined` values because Firestore rejects `undefined` fields. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

export function sanitizeDocId(raw: string): string {
  return raw.replace(/\//g, '_');
}

function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

function userSubcollection(uid: string, name: string) {
  return collection(db, 'users', uid, name);
}

/** Saves registration details on `users/{uid}` immediately after sign-up. */
export async function initializeRegisteredUserProfile(
  uid: string,
  info: { email: string; fullName?: string; propertyName?: string }
): Promise<void> {
  const ref = userDocRef(uid);
  const profile: OwnerProfile = {
    ...DEFAULT_OWNER_PROFILE,
    email: info.email || DEFAULT_OWNER_PROFILE.email,
    fullName: info.fullName?.trim() || DEFAULT_OWNER_PROFILE.fullName,
    accountHolder: info.fullName?.trim() || DEFAULT_OWNER_PROFILE.accountHolder,
    propertyName: info.propertyName?.trim() || DEFAULT_OWNER_PROFILE.propertyName,
  };
  await setDoc(ref, stripUndefined({ role: 'owner', profile }), { merge: true });
}

/** Seeds initial workspace data into Firestore if this user has not been initialized yet. */
export async function ensureUserWorkspaceInitialized(
  uid: string,
  hints: { email?: string; fullName?: string }
): Promise<void> {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);
  const existingData = snap.exists() ? (snap.data() as Record<string, unknown>) : null;

  if (existingData?.initialized === true) {
    return;
  }

  const existingProfile = (existingData?.profile ?? {}) as Partial<OwnerProfile>;
  const resolvedName =
    existingProfile.fullName || hints.fullName?.trim() || DEFAULT_OWNER_PROFILE.fullName;
  const profile: OwnerProfile = {
    ...DEFAULT_OWNER_PROFILE,
    ...existingProfile,
    fullName: resolvedName,
    accountHolder: existingProfile.accountHolder || resolvedName,
    email: existingProfile.email || hints.email || DEFAULT_OWNER_PROFILE.email,
  };
  const settings: WorkspaceSettings = {
    ...DEFAULT_WORKSPACE_SETTINGS,
    ...((existingData?.settings ?? {}) as Partial<WorkspaceSettings>),
  };

  const now = new Date();
  const batch = writeBatch(db);
  batch.set(
    ref,
    stripUndefined({
      initialized: true,
      profile,
      settings,
      updatedAt: now.getTime(),
    }),
    { merge: true }
  );

  for (const room of INITIAL_ROOMS) {
    batch.set(doc(userSubcollection(uid, 'rooms'), sanitizeDocId(room.id)), stripUndefined(room));
  }

  const initialRentMeta = createInitialRentMeta(now);
  for (const [roomId, meta] of Object.entries(initialRentMeta)) {
    batch.set(
      doc(userSubcollection(uid, 'rentRecords'), sanitizeDocId(roomId)),
      stripUndefined(meta)
    );
  }

  for (const tx of createInitialTransactions(now)) {
    batch.set(doc(userSubcollection(uid, 'transactions'), sanitizeDocId(tx.id)), stripUndefined(tx));
  }

  for (const notice of createInitialNotifications(now)) {
    batch.set(
      doc(userSubcollection(uid, 'notifications'), sanitizeDocId(notice.id)),
      stripUndefined(notice)
    );
  }

  for (const member of INITIAL_STAFF) {
    batch.set(
      doc(userSubcollection(uid, 'staff'), sanitizeDocId(member.id)),
      stripUndefined(member)
    );
  }

  await batch.commit();
}

export function subscribeUserWorkspace(
  uid: string,
  hints: { email?: string; fullName?: string },
  callbacks: WorkspaceCallbacks
): () => void {
  const handleErr = (err: unknown) => {
    callbacks.onError?.(err);
  };

  const unsubUser = onSnapshot(
    userDocRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as {
        profile?: Partial<OwnerProfile>;
        settings?: Partial<WorkspaceSettings>;
      };
      const mergedProfile: OwnerProfile = {
        ...DEFAULT_OWNER_PROFILE,
        ...(data.profile ?? {}),
        email: data.profile?.email || hints.email || DEFAULT_OWNER_PROFILE.email,
        fullName: data.profile?.fullName || hints.fullName || DEFAULT_OWNER_PROFILE.fullName,
      };
      const mergedSettings: WorkspaceSettings = {
        ...DEFAULT_WORKSPACE_SETTINGS,
        ...(data.settings ?? {}),
      };
      callbacks.onWorkspaceDoc(mergedProfile, mergedSettings);
    },
    handleErr
  );

  const unsubRooms = onSnapshot(
    userSubcollection(uid, 'rooms'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as RoomItem);
      callbacks.onRooms(list);
    },
    handleErr
  );

  const unsubRent = onSnapshot(
    userSubcollection(uid, 'rentRecords'),
    (snapshot) => {
      const map: Record<string, RoomRentMeta> = {};
      snapshot.docs.forEach((d) => {
        const meta = d.data() as RoomRentMeta;
        map[meta.roomId || d.id] = meta;
      });
      callbacks.onRentMeta(map);
    },
    handleErr
  );

  const unsubDeposits = onSnapshot(
    userSubcollection(uid, 'deposits'),
    (snapshot) => {
      const map: Record<string, RoomDepositOverride> = {};
      snapshot.docs.forEach((d) => {
        const dep = d.data() as RoomDepositOverride;
        const key = dep.roomNumber || dep.roomId || d.id;
        map[key] = dep;
      });
      callbacks.onDeposits(map);
    },
    handleErr
  );

  const unsubTransactions = onSnapshot(
    userSubcollection(uid, 'transactions'),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as TransactionItem)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callbacks.onTransactions(list);
    },
    handleErr
  );

  const unsubNotifications = onSnapshot(
    userSubcollection(uid, 'notifications'),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as NotificationItem)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callbacks.onNotifications(list);
    },
    handleErr
  );

  const unsubStaff = onSnapshot(
    userSubcollection(uid, 'staff'),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as StaffMember)
        .sort((a, b) => a.name.localeCompare(b.name));
      callbacks.onStaff(list);
    },
    handleErr
  );

  return () => {
    unsubUser();
    unsubRooms();
    unsubRent();
    unsubDeposits();
    unsubTransactions();
    unsubNotifications();
    unsubStaff();
  };
}

export async function saveOwnerProfile(uid: string, profile: OwnerProfile): Promise<void> {
  await setDoc(userDocRef(uid), stripUndefined({ profile, updatedAt: Date.now() }), { merge: true });
}

export async function saveWorkspaceSettings(
  uid: string,
  settings: WorkspaceSettings
): Promise<void> {
  await setDoc(userDocRef(uid), stripUndefined({ settings, updatedAt: Date.now() }), { merge: true });
}

export async function upsertRoom(uid: string, room: RoomItem): Promise<void> {
  await setDoc(doc(userSubcollection(uid, 'rooms'), sanitizeDocId(room.id)), stripUndefined(room));
}

export async function upsertRoomsBatch(uid: string, rooms: RoomItem[]): Promise<void> {
  if (rooms.length === 0) return;
  const batch = writeBatch(db);
  for (const room of rooms) {
    batch.set(doc(userSubcollection(uid, 'rooms'), sanitizeDocId(room.id)), stripUndefined(room));
  }
  await batch.commit();
}

export async function deleteRoomAndRelated(
  uid: string,
  roomId: string,
  roomNumber: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(userSubcollection(uid, 'rooms'), sanitizeDocId(roomId)));
  batch.delete(doc(userSubcollection(uid, 'rentRecords'), sanitizeDocId(roomId)));
  batch.delete(doc(userSubcollection(uid, 'deposits'), sanitizeDocId(roomNumber)));
  await batch.commit();
}

export async function upsertRentMeta(uid: string, meta: RoomRentMeta): Promise<void> {
  await setDoc(
    doc(userSubcollection(uid, 'rentRecords'), sanitizeDocId(meta.roomId)),
    stripUndefined(meta)
  );
}

export async function upsertDepositOverride(
  uid: string,
  roomNumber: string,
  override: RoomDepositOverride
): Promise<void> {
  await setDoc(
    doc(userSubcollection(uid, 'deposits'), sanitizeDocId(roomNumber)),
    stripUndefined({ ...override, roomNumber })
  );
}

export async function upsertTransaction(uid: string, tx: TransactionItem): Promise<void> {
  await setDoc(doc(userSubcollection(uid, 'transactions'), sanitizeDocId(tx.id)), stripUndefined(tx));
}

export async function deleteTransaction(uid: string, txId: string): Promise<void> {
  await deleteDoc(doc(userSubcollection(uid, 'transactions'), sanitizeDocId(txId)));
}

export async function upsertNotification(uid: string, notice: NotificationItem): Promise<void> {
  await setDoc(
    doc(userSubcollection(uid, 'notifications'), sanitizeDocId(notice.id)),
    stripUndefined(notice)
  );
}

export async function clearAllNotificationsInDb(uid: string, noticeIds: string[]): Promise<void> {
  if (noticeIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of noticeIds) {
    batch.delete(doc(userSubcollection(uid, 'notifications'), sanitizeDocId(id)));
  }
  await batch.commit();
}

async function deleteSubcollectionDocs(uid: string, subcollectionName: string) {
  const snap = await getDocs(userSubcollection(uid, subcollectionName));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function upsertStaffMember(uid: string, member: StaffMember): Promise<void> {
  await setDoc(doc(userSubcollection(uid, 'staff'), sanitizeDocId(member.id)), stripUndefined(member));
}

export async function deleteStaffMember(uid: string, staffId: string): Promise<void> {
  await deleteDoc(doc(userSubcollection(uid, 'staff'), sanitizeDocId(staffId)));
}

export async function clearWorkspaceRecords(uid: string): Promise<void> {
  await Promise.all([
    deleteSubcollectionDocs(uid, 'rooms'),
    deleteSubcollectionDocs(uid, 'rentRecords'),
    deleteSubcollectionDocs(uid, 'deposits'),
    deleteSubcollectionDocs(uid, 'transactions'),
    deleteSubcollectionDocs(uid, 'notifications'),
    deleteSubcollectionDocs(uid, 'staff'),
  ]);
}

export async function saveUserRole(uid: string, role: UserRole): Promise<void> {
  await setDoc(userDocRef(uid), { role, updatedAt: Date.now() }, { merge: true });
}

export async function fetchUserRole(uid: string): Promise<UserRole | null> {
  const snap = await getDoc(userDocRef(uid));
  if (snap.exists()) {
    const data = snap.data() as { role?: string; initialized?: boolean };
    if (data.role === 'customer' || data.role === 'owner') return data.role;
    if (data.initialized === true) return 'owner';
  }
  const customerSnap = await getDoc(customerWorkspaceDocRef(uid));
  if (customerSnap.exists()) return 'customer';
  return null;
}

function customerWorkspaceDocRef(uid: string) {
  return doc(db, 'users', uid, 'customer', 'workspace');
}

export async function initializeCustomerProfile(
  uid: string,
  info: { email: string; fullName?: string; roomNumber?: string; propertyName?: string }
): Promise<CustomerWorkspaceData> {
  const initialData = createInitialCustomerData(info);
  await setDoc(userDocRef(uid), { role: 'customer', updatedAt: Date.now() }, { merge: true });
  await setDoc(
    customerWorkspaceDocRef(uid),
    stripUndefined({ ...initialData, initialized: true, updatedAt: Date.now() }),
    { merge: true }
  );
  return initialData;
}

export async function ensureCustomerWorkspaceInitialized(
  uid: string,
  hints: { email?: string; fullName?: string; roomNumber?: string; propertyName?: string }
): Promise<CustomerWorkspaceData> {
  const ref = customerWorkspaceDocRef(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as Partial<CustomerWorkspaceData>;
    const fallback = createInitialCustomerData(hints);
    return {
      ...fallback,
      ...data,
      profile: { ...fallback.profile, ...(data.profile ?? {}) },
      room: { ...fallback.room, ...(data.room ?? {}) },
      rentMeta: { ...fallback.rentMeta, ...(data.rentMeta ?? {}) },
      deposit: { ...fallback.deposit, ...(data.deposit ?? {}) },
      ownerContact: { ...fallback.ownerContact, ...(data.ownerContact ?? {}) },
      leaseInfo: { ...fallback.leaseInfo, ...(data.leaseInfo ?? {}) },
      requests: Array.isArray(data.requests) ? data.requests : fallback.requests,
      notices: Array.isArray(data.notices) ? data.notices : fallback.notices,
    };
  }
  const initialData = createInitialCustomerData(hints);
  await setDoc(
    ref,
    stripUndefined({ ...initialData, initialized: true, updatedAt: Date.now() }),
    { merge: true }
  );
  return initialData;
}

export function subscribeCustomerWorkspace(
  uid: string,
  hints: { email?: string; fullName?: string },
  onData: (data: CustomerWorkspaceData) => void,
  onError?: (error: unknown) => void
): () => void {
  return onSnapshot(
    customerWorkspaceDocRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Partial<CustomerWorkspaceData>;
      const fallback = createInitialCustomerData(hints);
      onData({
        ...fallback,
        ...data,
        profile: { ...fallback.profile, ...(data.profile ?? {}) },
        room: { ...fallback.room, ...(data.room ?? {}) },
        rentMeta: { ...fallback.rentMeta, ...(data.rentMeta ?? {}) },
        deposit: { ...fallback.deposit, ...(data.deposit ?? {}) },
        ownerContact: { ...fallback.ownerContact, ...(data.ownerContact ?? {}) },
        leaseInfo: { ...fallback.leaseInfo, ...(data.leaseInfo ?? {}) },
        requests: Array.isArray(data.requests) ? data.requests : fallback.requests,
        notices: Array.isArray(data.notices) ? data.notices : fallback.notices,
      });
    },
    (err) => onError?.(err)
  );
}

export async function saveCustomerWorkspace(
  uid: string,
  data: CustomerWorkspaceData
): Promise<void> {
  await setDoc(
    customerWorkspaceDocRef(uid),
    stripUndefined({ ...data, initialized: true, updatedAt: Date.now() }),
    { merge: true }
  );
}

