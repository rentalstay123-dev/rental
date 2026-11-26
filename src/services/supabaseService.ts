import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import {
  DEFAULT_OWNER_PROFILE,
  DEFAULT_WORKSPACE_SETTINGS,
} from '../constants/initialData';
import { createInitialCustomerData } from '../constants/customerInitialData';
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

export interface OwnerWorkspaceRow {
  user_id: string;
  role?: string;
  profile: OwnerProfile;
  settings: WorkspaceSettings;
  rooms: RoomItem[];
  rent_records: Record<string, RoomRentMeta>;
  deposits: Record<string, RoomDepositOverride>;
  transactions: TransactionItem[];
  notifications: NotificationItem[];
  staff: StaffMember[];
  initialized: boolean;
  updated_at: string;
}

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

const ownerMemoryCache = new Map<string, OwnerWorkspaceRow>();
const customerMemoryCache = new Map<string, CustomerWorkspaceData>();

const CURRENT_CACHE_VERSION = 'v7_clean';

function getOwnerStorageKey(uid: string): string {
  return `@luvora_ws_${CURRENT_CACHE_VERSION}_${uid}`;
}

function getCustomerStorageKey(uid: string): string {
  return `@luvora_cws_${CURRENT_CACHE_VERSION}_${uid}`;
}

export function isDirtyMockOwnerRow(row: OwnerWorkspaceRow | null | undefined): boolean {
  if (!row) return false;
  const fullName = (row.profile?.fullName || '').toLowerCase();
  const email = (row.profile?.email || '').toLowerCase();
  const propertyName = (row.profile?.propertyName || '').toLowerCase();

  if (fullName.includes('rajesh') || fullName.includes('sharma')) return true;
  if (email.includes('owner@luvora.com')) return true;
  if (propertyName.includes('sunrise')) return true;

  if (Array.isArray(row.rooms)) {
    if (row.rooms.length === 11) return true;
    const hasMockRoom = row.rooms.some((r) => {
      const roomAny = r as unknown as { tenant?: { name?: string }; members?: { name?: string }[] };
      const tname = (roomAny.tenant?.name || '').toLowerCase();
      const memberNames = (roomAny.members || []).map((m) => (m.name || '').toLowerCase()).join(' ');
      return (
        tname.includes('priya') ||
        tname.includes('arjun') ||
        tname.includes('rahul') ||
        tname.includes('anil') ||
        tname.includes('kavita') ||
        memberNames.includes('priya') ||
        memberNames.includes('arjun') ||
        memberNames.includes('rahul') ||
        memberNames.includes('anil') ||
        memberNames.includes('kavita') ||
        memberNames.includes('ramesh') ||
        memberNames.includes('lakshmi') ||
        memberNames.includes('suresh') ||
        r.id === '1' ||
        r.id === '2' ||
        r.id === '3' ||
        r.id === 'r1' ||
        r.id === 'r2'
      );
    });
    if (hasMockRoom) return true;
  }

  if (Array.isArray(row.transactions) && row.transactions.length > 0) {
    const hasMockTx = row.transactions.some(
      (t) =>
        t.title?.includes('Priya') ||
        t.title?.includes('Arjun') ||
        t.numericAmount === 58000 ||
        t.numericAmount === 69500 ||
        t.numericAmount === 11500 ||
        t.numericAmount === 25000
    );
    if (hasMockTx) return true;
  }

  return false;
}

export function isDirtyMockCustomerData(data: CustomerWorkspaceData | null | undefined): boolean {
  if (!data) return false;
  const name = (data.profile?.fullName || '').toLowerCase();
  if (
    name.includes('priya') ||
    name.includes('arjun') ||
    name.includes('rahul') ||
    name.includes('anil') ||
    name.includes('rajesh')
  ) {
    return true;
  }
  const roomAny = data.room as unknown as { tenant?: { name?: string } } | undefined;
  if (roomAny?.tenant?.name?.toLowerCase().includes('priya')) return true;
  return false;
}

export async function purgeLegacyMockStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove: string[] = [];

    const mockPatterns = [
      'rajesh',
      'priya',
      'arjun',
      'anil rao',
      'kavita rao',
      'owner@luvora.com',
      'sunrise apartments',
      '58000',
      '69500',
      '11500',
      '25000',
    ];

    for (const key of keys) {
      const isLuvoraKey =
        key.startsWith('@luvora_') ||
        key.startsWith('@app_data_') ||
        key.startsWith('@firebase_');

      if (!isLuvoraKey) continue;

      const isCurrentVersion =
        key.startsWith(`@luvora_ws_${CURRENT_CACHE_VERSION}_`) ||
        key.startsWith(`@luvora_cws_${CURRENT_CACHE_VERSION}_`) ||
        key.startsWith('@luvora_role_');

      if (!isCurrentVersion) {
        toRemove.push(key);
      } else {
        const val = await AsyncStorage.getItem(key);
        if (val) {
          const valLower = val.toLowerCase();
          if (mockPatterns.some((pattern) => valLower.includes(pattern))) {
            toRemove.push(key);
          }
        }
      }
    }

    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
    ownerMemoryCache.clear();
    customerMemoryCache.clear();
  } catch {
    // Ignore storage errors
  }
}

async function loadOwnerLocalCache(uid: string): Promise<OwnerWorkspaceRow | null> {
  if (ownerMemoryCache.has(uid)) {
    const cached = ownerMemoryCache.get(uid)!;
    if (isDirtyMockOwnerRow(cached)) {
      ownerMemoryCache.delete(uid);
    } else {
      return cached;
    }
  }
  try {
    const raw = await AsyncStorage.getItem(getOwnerStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as OwnerWorkspaceRow;
      if (isDirtyMockOwnerRow(parsed)) {
        await AsyncStorage.removeItem(getOwnerStorageKey(uid));
        return null;
      }
      ownerMemoryCache.set(uid, parsed);
      return parsed;
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

async function persistOwnerLocalCache(uid: string, row: OwnerWorkspaceRow): Promise<void> {
  if (isDirtyMockOwnerRow(row)) {
    return;
  }
  ownerMemoryCache.set(uid, row);
  try {
    await AsyncStorage.setItem(getOwnerStorageKey(uid), JSON.stringify(row));
  } catch {
    // Ignore cache write errors
  }
}

async function loadCustomerLocalCache(uid: string): Promise<CustomerWorkspaceData | null> {
  if (customerMemoryCache.has(uid)) {
    const cached = customerMemoryCache.get(uid)!;
    if (isDirtyMockCustomerData(cached)) {
      customerMemoryCache.delete(uid);
    } else {
      return cached;
    }
  }
  try {
    const raw = await AsyncStorage.getItem(getCustomerStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw) as CustomerWorkspaceData;
      if (isDirtyMockCustomerData(parsed)) {
        await AsyncStorage.removeItem(getCustomerStorageKey(uid));
        return null;
      }
      customerMemoryCache.set(uid, parsed);
      return parsed;
    }
  } catch {
    // Ignore cache read errors
  }
  return null;
}

async function persistCustomerLocalCache(uid: string, data: CustomerWorkspaceData): Promise<void> {
  if (isDirtyMockCustomerData(data)) {
    return;
  }
  customerMemoryCache.set(uid, data);
  try {
    await AsyncStorage.setItem(getCustomerStorageKey(uid), JSON.stringify(data));
  } catch {
    // Ignore cache write errors
  }
}

function createDefaultOwnerRow(
  uid: string,
  hints?: { email?: string; fullName?: string; propertyName?: string }
): OwnerWorkspaceRow {
  const profile: OwnerProfile = {
    ...DEFAULT_OWNER_PROFILE,
    email: hints?.email || DEFAULT_OWNER_PROFILE.email,
    fullName: hints?.fullName || DEFAULT_OWNER_PROFILE.fullName,
    propertyName: hints?.propertyName || DEFAULT_OWNER_PROFILE.propertyName,
    accountHolder: hints?.fullName || DEFAULT_OWNER_PROFILE.accountHolder,
  };
  return {
    user_id: uid,
    role: 'owner',
    profile,
    settings: DEFAULT_WORKSPACE_SETTINGS,
    rooms: [],
    rent_records: {},
    deposits: {},
    transactions: [],
    notifications: [],
    staff: [],
    initialized: true,
    updated_at: new Date().toISOString(),
  };
}

/** Saves registration details for an owner workspace. */
export async function initializeRegisteredUserProfile(
  uid: string,
  info: { email: string; fullName?: string; propertyName?: string }
): Promise<void> {
  const existing = (await loadOwnerLocalCache(uid)) || createDefaultOwnerRow(uid, info);
  const updatedProfile: OwnerProfile = {
    ...existing.profile,
    email: info.email || existing.profile.email,
    fullName: info.fullName?.trim() || existing.profile.fullName,
    accountHolder: info.fullName?.trim() || existing.profile.accountHolder,
    propertyName: info.propertyName?.trim() || existing.profile.propertyName,
  };
  const updatedRow: OwnerWorkspaceRow = {
    ...existing,
    profile: updatedProfile,
    updated_at: new Date().toISOString(),
  };

  await persistOwnerLocalCache(uid, updatedRow);

  try {
    await supabase.from('user_roles').upsert({
      user_id: uid,
      role: 'owner',
      updated_at: new Date().toISOString(),
    });

    await supabase.from('workspaces').upsert(stripUndefined(updatedRow));
  } catch {
    // Supabase push failed or table not created yet; cached locally.
  }
}

/** Seeds initial owner workspace data into Supabase / local cache. */
export async function ensureUserWorkspaceInitialized(
  uid: string,
  hints: { email?: string; fullName?: string }
): Promise<void> {
  const cached = await loadOwnerLocalCache(uid);
  if (cached) {
    return;
  }

  // Try checking Supabase remote first
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (!error && data) {
      await persistOwnerLocalCache(uid, data as OwnerWorkspaceRow);
      return;
    }
  } catch {
    // Offline or table not present - return without overwriting remote
    return;
  }

  const newRow = createDefaultOwnerRow(uid, hints);
  await persistOwnerLocalCache(uid, newRow);

  try {
    await supabase.from('user_roles').upsert({
      user_id: uid,
      role: 'owner',
      updated_at: new Date().toISOString(),
    });

    const { error: insertErr } = await supabase.from('workspaces').upsert(stripUndefined(newRow));
    if (insertErr) {
      console.warn('[Supabase] Initial workspace upsert error:', insertErr.message);
    }
  } catch {
    // Ignore if offline
  }
}

/** Subscribes to an owner's workspace with local caching + Supabase realtime sync. */
export function subscribeUserWorkspace(
  uid: string,
  hints: { email?: string; fullName?: string },
  callbacks: WorkspaceCallbacks
): () => void {
  let isCancelled = false;

  const emitRow = (row: OwnerWorkspaceRow) => {
    callbacks.onWorkspaceDoc(row.profile, row.settings);
    callbacks.onRooms(row.rooms || []);
    callbacks.onRentMeta(row.rent_records || {});
    callbacks.onDeposits(row.deposits || {});
    callbacks.onTransactions(
      (row.transactions || []).slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    );
    callbacks.onNotifications(
      (row.notifications || []).slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    );
    callbacks.onStaff((row.staff || []).slice().sort((a, b) => a.name.localeCompare(b.name)));
  };

  // 1. Deliver local cache immediately
  void loadOwnerLocalCache(uid).then((cached) => {
    if (isCancelled) return;
    if (cached && !isDirtyMockOwnerRow(cached)) {
      emitRow(cached);
    } else {
      const fallback = createDefaultOwnerRow(uid, hints);
      emitRow(fallback);
      void persistOwnerLocalCache(uid, fallback);
    }
  });

  // 2. Fetch remote Supabase workspace
  void (async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (isCancelled) return;
      if (error) {
        callbacks.onError?.(error);
        return;
      }
      if (data) {
        if (isDirtyMockOwnerRow(data as OwnerWorkspaceRow)) {
          const cleanRow = createDefaultOwnerRow(uid, hints);
          void persistOwnerLocalCache(uid, cleanRow);
          emitRow(cleanRow);
          try {
            await supabase.from('workspaces').upsert(stripUndefined(cleanRow));
          } catch {
            // Ignore
          }
          return;
        }
        const merged: OwnerWorkspaceRow = {
          user_id: uid,
          role: data.role || 'owner',
          profile: data.profile || DEFAULT_OWNER_PROFILE,
          settings: data.settings || DEFAULT_WORKSPACE_SETTINGS,
          rooms: Array.isArray(data.rooms) ? data.rooms : [],
          rent_records: data.rent_records || {},
          deposits: data.deposits || {},
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          notifications: Array.isArray(data.notifications) ? data.notifications : [],
          staff: Array.isArray(data.staff) ? data.staff : [],
          initialized: true,
          updated_at: data.updated_at || new Date().toISOString(),
        };
        void persistOwnerLocalCache(uid, merged);
        emitRow(merged);
      } else {
        const blankRow = createDefaultOwnerRow(uid, hints);
        void persistOwnerLocalCache(uid, blankRow);
        emitRow(blankRow);
        try {
          await supabase.from('workspaces').upsert(stripUndefined(blankRow));
        } catch {
          // Supabase upsert fallback
        }
      }
    } catch (err: unknown) {
      if (!isCancelled) callbacks.onError?.(err);
    }
  })();

  // 3. Supabase Realtime channel
  const channel = supabase
    .channel(`public:workspaces:${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspaces',
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        if (isCancelled) return;
        const newRow = payload.new as OwnerWorkspaceRow;
        if (newRow && newRow.user_id === uid) {
          void persistOwnerLocalCache(uid, newRow);
          emitRow(newRow);
        }
      }
    )
    .subscribe();

  return () => {
    isCancelled = true;
    void supabase.removeChannel(channel);
  };
}

async function mutateOwnerWorkspace(
  uid: string,
  updater: (prev: OwnerWorkspaceRow) => OwnerWorkspaceRow,
  columnPatch?: Record<string, unknown> | ((updated: OwnerWorkspaceRow) => Record<string, unknown>)
): Promise<void> {
  let current = ownerMemoryCache.get(uid);
  if (!current) {
    current = (await loadOwnerLocalCache(uid)) ?? undefined;
  }
  if (!current) {
    try {
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (data) {
        current = data as OwnerWorkspaceRow;
      }
    } catch {
      // offline
    }
  }
  if (!current) {
    current = createDefaultOwnerRow(uid);
  }

  const updated = updater(current);
  updated.updated_at = new Date().toISOString();
  await persistOwnerLocalCache(uid, updated);

  const patch = typeof columnPatch === 'function' ? columnPatch(updated) : columnPatch;
  const payloadToUpdate = patch
    ? { ...patch, updated_at: updated.updated_at }
    : stripUndefined(updated);

  try {
    const { error: updateErr, count } = await supabase
      .from('workspaces')
      .update(stripUndefined(payloadToUpdate), { count: 'exact' })
      .eq('user_id', uid);

    if (updateErr || count === 0) {
      const { error: upsertErr } = await supabase
        .from('workspaces')
        .upsert(stripUndefined(updated));
      if (upsertErr) {
        console.warn('[Supabase] Mutation error:', upsertErr.message);
        throw upsertErr;
      }
    }
  } catch (err) {
    throw err;
  }
}

export async function saveOwnerProfile(uid: string, profile: OwnerProfile): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({ ...prev, profile }),
    { profile }
  );
}

export async function saveWorkspaceSettings(uid: string, settings: WorkspaceSettings): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({ ...prev, settings }),
    { settings }
  );
}

export async function upsertRoom(uid: string, room: RoomItem): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const existingIdx = prev.rooms.findIndex((r) => r.id === room.id);
      const nextRooms = [...prev.rooms];
      if (existingIdx >= 0) {
        nextRooms[existingIdx] = room;
      } else {
        nextRooms.push(room);
      }
      return { ...prev, rooms: nextRooms };
    },
    (updated) => ({ rooms: updated.rooms })
  );
}

export async function upsertRoomsBatch(uid: string, rooms: RoomItem[]): Promise<void> {
  if (rooms.length === 0) return;
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const map = new Map<string, RoomItem>(prev.rooms.map((r) => [r.id, r]));
      rooms.forEach((r) => map.set(r.id, r));
      return { ...prev, rooms: Array.from(map.values()) };
    },
    (updated) => ({ rooms: updated.rooms })
  );
}

export async function saveRoomsFullList(uid: string, rooms: RoomItem[]): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({ ...prev, rooms }),
    { rooms }
  );
}

export async function deleteRoomAndRelated(
  uid: string,
  roomId: string,
  roomNumber: string
): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const nextRooms = prev.rooms.filter((r) => r.id !== roomId);
      const nextRent = { ...prev.rent_records };
      delete nextRent[roomId];
      const nextDeposits = { ...prev.deposits };
      delete nextDeposits[roomNumber];
      delete nextDeposits[roomId];
      return {
        ...prev,
        rooms: nextRooms,
        rent_records: nextRent,
        deposits: nextDeposits,
      };
    },
    (updated) => ({
      rooms: updated.rooms,
      rent_records: updated.rent_records,
      deposits: updated.deposits,
    })
  );
}

export async function upsertRentMeta(uid: string, meta: RoomRentMeta): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      rent_records: {
        ...prev.rent_records,
        [meta.roomId]: meta,
      },
    }),
    (updated) => ({ rent_records: updated.rent_records })
  );
}

export async function upsertDepositOverride(
  uid: string,
  roomNumber: string,
  override: RoomDepositOverride
): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      deposits: {
        ...prev.deposits,
        [roomNumber]: { ...override, roomNumber },
      },
    }),
    (updated) => ({ deposits: updated.deposits })
  );
}

export async function upsertTransaction(uid: string, tx: TransactionItem): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const nextList = [tx, ...prev.transactions.filter((t) => t.id !== tx.id)];
      return { ...prev, transactions: nextList };
    },
    (updated) => ({ transactions: updated.transactions })
  );
}

export async function deleteTransaction(uid: string, txId: string): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== txId),
    }),
    (updated) => ({ transactions: updated.transactions })
  );
}

export async function upsertNotification(uid: string, notice: NotificationItem): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const nextList = [notice, ...prev.notifications.filter((n) => n.id !== notice.id)];
      return { ...prev, notifications: nextList };
    },
    (updated) => ({ notifications: updated.notifications })
  );
}

export async function clearAllNotificationsInDb(uid: string, noticeIds: string[]): Promise<void> {
  if (noticeIds.length === 0) return;
  const set = new Set(noticeIds);
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => !set.has(n.id)),
    }),
    (updated) => ({ notifications: updated.notifications })
  );
}

export async function upsertStaffMember(uid: string, member: StaffMember): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const idx = prev.staff.findIndex((s) => s.id === member.id);
      const next = [...prev.staff];
      if (idx >= 0) {
        next[idx] = member;
      } else {
        next.push(member);
      }
      return { ...prev, staff: next };
    },
    (updated) => ({ staff: updated.staff })
  );
}

export async function deleteStaffMember(uid: string, staffId: string): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      staff: prev.staff.filter((s) => s.id !== staffId),
    }),
    (updated) => ({ staff: updated.staff })
  );
}

export async function recordPaymentBatch(
  uid: string,
  meta: RoomRentMeta,
  updatedRoom: RoomItem | null,
  tx: TransactionItem,
  notice: NotificationItem
): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => {
      const nextRooms = updatedRoom
        ? prev.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
        : prev.rooms;
      return {
        ...prev,
        rooms: nextRooms,
        rent_records: { ...prev.rent_records, [meta.roomId]: meta },
        transactions: [tx, ...prev.transactions.filter((t) => t.id !== tx.id)],
        notifications: [notice, ...prev.notifications.filter((n) => n.id !== notice.id)],
      };
    },
    (updated) => ({
      rooms: updated.rooms,
      rent_records: updated.rent_records,
      transactions: updated.transactions,
      notifications: updated.notifications,
    })
  );
}

export async function clearWorkspaceRecords(uid: string): Promise<void> {
  await mutateOwnerWorkspace(
    uid,
    (prev) => ({
      ...prev,
      rooms: [],
      rent_records: {},
      deposits: {},
      transactions: [],
      notifications: [],
      staff: [],
    }),
    {
      rooms: [],
      rent_records: {},
      deposits: {},
      transactions: [],
      notifications: [],
      staff: [],
    }
  );
}

export async function saveUserRole(uid: string, role: UserRole): Promise<void> {
  const normalizedRole: 'owner' | 'customer' = role === 'admin' ? 'owner' : role;
  try {
    await AsyncStorage.setItem(`@luvora_role_${uid}`, normalizedRole);
    await supabase.from('user_roles').upsert({
      user_id: uid,
      role: normalizedRole,
      updated_at: new Date().toISOString(),
    });
    // Ensure Supabase Auth user_metadata also has the role persisted
    await supabase.auth.updateUser({
      data: { role: normalizedRole },
    }).catch(() => {});
  } catch {
    // Ignore error
  }
}

export async function fetchUserRole(uid: string): Promise<UserRole | null> {
  // 1. Try local cache
  try {
    const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
    if (cached === 'customer' || cached === 'owner' || cached === 'admin') {
      return cached === 'admin' ? 'owner' : (cached as UserRole);
    }
  } catch {
    // Ignore storage read error
  }

  // 2. Query Supabase user_roles table
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();

    if (data?.role) {
      const parsedRole: UserRole = data.role === 'admin' ? 'owner' : (data.role as UserRole);
      await AsyncStorage.setItem(`@luvora_role_${uid}`, parsedRole);
      return parsedRole;
    }
  } catch {
    // Ignore network error
  }

  // 3. Check customer_workspaces table - if record exists, role is customer
  try {
    const { data: customerData } = await supabase
      .from('customer_workspaces')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();

    if (customerData?.user_id) {
      await saveUserRole(uid, 'customer');
      return 'customer';
    }
  } catch {
    // Ignore network error
  }

  // 4. Check workspaces table - if record exists, role is owner / admin
  try {
    const { data: ownerData } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();

    if (ownerData?.user_id) {
      await saveUserRole(uid, 'owner');
      return 'owner';
    }
  } catch {
    // Ignore network error
  }

  return null;
}

export async function initializeCustomerProfile(
  uid: string,
  info: { email: string; fullName?: string; roomNumber?: string; propertyName?: string }
): Promise<CustomerWorkspaceData> {
  const initialData = createInitialCustomerData(info);
  await saveUserRole(uid, 'customer');
  await persistCustomerLocalCache(uid, initialData);

  try {
    await supabase.from('customer_workspaces').upsert({
      user_id: uid,
      workspace_data: stripUndefined(initialData),
      initialized: true,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Offline or table not present
  }

  return initialData;
}

export async function ensureCustomerWorkspaceInitialized(
  uid: string,
  hints: { email?: string; fullName?: string; roomNumber?: string; propertyName?: string }
): Promise<CustomerWorkspaceData> {
  const cached = await loadCustomerLocalCache(uid);
  if (cached) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('customer_workspaces')
      .select('workspace_data')
      .eq('user_id', uid)
      .maybeSingle();

    if (!error && data?.workspace_data) {
      const merged = {
        ...createInitialCustomerData(hints),
        ...data.workspace_data,
      };
      await persistCustomerLocalCache(uid, merged);
      return merged;
    }
  } catch {
    // Offline or table not created
  }

  const initialData = createInitialCustomerData(hints);
  await persistCustomerLocalCache(uid, initialData);

  try {
    await supabase.from('customer_workspaces').upsert({
      user_id: uid,
      workspace_data: stripUndefined(initialData),
      initialized: true,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Ignore error
  }

  return initialData;
}

export function subscribeCustomerWorkspace(
  uid: string,
  hints: { email?: string; fullName?: string },
  onData: (data: CustomerWorkspaceData) => void,
  onError?: (error: unknown) => void
): () => void {
  let isCancelled = false;

  void loadCustomerLocalCache(uid).then((cached) => {
    if (isCancelled) return;
    if (cached && !isDirtyMockCustomerData(cached)) {
      onData(cached);
    } else {
      const fallback = createInitialCustomerData(hints);
      onData(fallback);
      void persistCustomerLocalCache(uid, fallback);
    }
  });

  void (async () => {
    try {
      const { data, error } = await supabase
        .from('customer_workspaces')
        .select('workspace_data')
        .eq('user_id', uid)
        .maybeSingle();

      if (isCancelled) return;
      if (error) {
        onError?.(error);
        return;
      }
      if (data?.workspace_data) {
        const merged: CustomerWorkspaceData = {
          ...createInitialCustomerData(hints),
          ...data.workspace_data,
        };
        void persistCustomerLocalCache(uid, merged);
        onData(merged);
      } else {
        const fresh = createInitialCustomerData(hints);
        void persistCustomerLocalCache(uid, fresh);
        onData(fresh);
        try {
          await supabase.from('customer_workspaces').upsert({
            user_id: uid,
            workspace_data: stripUndefined(fresh),
            initialized: true,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Ignore error
        }
      }
    } catch (err: unknown) {
      if (!isCancelled) onError?.(err);
    }
  })();

  const channel = supabase
    .channel(`public:customer_workspaces:${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'customer_workspaces',
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        if (isCancelled) return;
        const newRecord = payload.new as { user_id: string; workspace_data?: CustomerWorkspaceData };
        if (newRecord?.workspace_data) {
          void persistCustomerLocalCache(uid, newRecord.workspace_data);
          onData(newRecord.workspace_data);
        }
      }
    )
    .subscribe();

  return () => {
    isCancelled = true;
    void supabase.removeChannel(channel);
  };
}

export async function saveCustomerWorkspace(
  uid: string,
  data: CustomerWorkspaceData
): Promise<void> {
  await persistCustomerLocalCache(uid, data);
  try {
    await supabase.from('customer_workspaces').upsert({
      user_id: uid,
      workspace_data: stripUndefined(data),
      initialized: true,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Offline or table not present
  }
}
