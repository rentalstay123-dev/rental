import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  clearAllNotificationsInDb,
  clearWorkspaceRecords,
  deleteRoomAndRelated,
  deleteStaffMember,
  deleteTransaction,
  ensureUserWorkspaceInitialized,
  recordPaymentBatch,
  saveOwnerProfile,
  saveRoomsFullList,
  saveWorkspaceSettings,
  subscribeUserWorkspace,
  upsertDepositOverride,
  upsertNotification,
  upsertRentMeta,
  upsertRoom,
  upsertRoomsBatch,
  upsertStaffMember,
  upsertTransaction,
} from '../services/supabaseService';
import type {
  NotificationItem,
  OwnerProfile,
  PaymentMode,
  PaymentRecord,
  ResolvedRoomRent,
  RoomDepositOverride,
  RoomItem,
  RoomRentMeta,
  ServiceRequestPriority,
  ServiceRequestStatus,
  StaffMember,
  TransactionItem,
  TransactionKind,
  WorkspaceSettings,
} from '../types/appData';
import {
  computeDashboardMetrics,
  DashboardMetrics,
  deriveRoomRentList,
  extractCycleDayNumber,
  formatRupeeAmount,
  formatShortDate,
  MONTHS_SHORT,
  parseShortDateToIso,
  sortRoomsByNumber,
  toIsoDate,
} from '../utils/finance';

export interface RecordPaymentInput {
  room: ResolvedRoomRent;
  paidNum: number;
  rentAppliedNum: number;
  excessAdvanceNum: number;
  updatedAdvanceFormatted: string;
  updatedDueDate: string;
  isThisMonthSettled: boolean;
  newRecords: PaymentRecord[];
  paymentDate: string;
  mode: PaymentMode;
}

export interface AddTransactionInput {
  kind: TransactionKind;
  title: string;
  subtitle: string;
  numericAmount: number;
  dateObj?: Date;
}

export interface AddNotificationInput {
  type: 'customer' | 'system';
  senderName: string;
  roomNumber: string;
  phone?: string;
  tag: string;
  message: string;
  priority?: ServiceRequestPriority;
  status?: ServiceRequestStatus;
  assignedStaff?: string;
}

interface AppDataContextValue {
  uid: string;
  profile: OwnerProfile;
  settings: WorkspaceSettings;
  rooms: RoomItem[];
  rentList: ResolvedRoomRent[];
  depositOverrides: Record<string, RoomDepositOverride>;
  transactions: TransactionItem[];
  notifications: NotificationItem[];
  staff: StaffMember[];
  dashboardMetrics: DashboardMetrics;
  isInitialLoading: boolean;
  syncError: string | null;
  dismissSyncError: () => void;
  refreshWorkspace: () => Promise<void>;
  updateProfile: (next: OwnerProfile) => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;
  setFloors: React.Dispatch<React.SetStateAction<string[]>>;
  setRoomTypes: React.Dispatch<React.SetStateAction<string[]>>;
  setMaintenanceReasons: React.Dispatch<React.SetStateAction<string[]>>;
  upsertSingleRoom: (room: RoomItem) => Promise<void>;
  addRooms: (newRooms: RoomItem[]) => Promise<void>;
  setRoomsList: React.Dispatch<React.SetStateAction<RoomItem[]>>;
  removeRoom: (room: RoomItem) => Promise<void>;
  recordRentPayment: (input: RecordPaymentInput) => Promise<void>;
  markRoomRentDue: (roomId: string) => Promise<void>;
  saveDepositOverride: (roomNumber: string, override: RoomDepositOverride) => Promise<void>;
  addTransaction: (input: AddTransactionInput) => Promise<void>;
  removeTransaction: (txId: string) => Promise<void>;
  addNotification: (input: AddNotificationInput) => Promise<void>;
  updateNotification: (noticeId: string, patch: Partial<NotificationItem>) => Promise<void>;
  markNotificationRead: (noticeId: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  upsertStaff: (member: StaffMember) => Promise<void>;
  removeStaff: (staffId: string) => Promise<void>;
  payStaffSalary: (member: StaffMember, amountNum?: number, dateObj?: Date) => Promise<void>;
  loadSampleStaff: () => Promise<void>;
  clearAllWorkspaceData: () => Promise<void>;
  restoreSampleWorkspaceData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

interface AppDataProviderProps {
  uid: string;
  userEmail?: string;
  userName?: string;
  children: React.ReactNode;
}

function getFriendlySyncError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied' || code === '42501') {
    return 'Supabase permission denied. Check your Row Level Security (RLS) policies.';
  }
  if (code === 'unavailable' || code === 'PGRST205') {
    return 'Supabase tables not configured yet. Changes are stored locally.';
  }
  const msg = (error as { message?: string })?.message;
  return msg ? `Cloud sync issue: ${msg}` : 'Could not sync with Supabase.';
}

export function AppDataProvider({ uid, userEmail, userName, children }: AppDataProviderProps) {
  const [profile, setProfile] = useState<OwnerProfile>(() => ({
    ...DEFAULT_OWNER_PROFILE,
    email: userEmail || DEFAULT_OWNER_PROFILE.email,
    fullName: userName || DEFAULT_OWNER_PROFILE.fullName,
  }));
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_WORKSPACE_SETTINGS);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [rentMetaByRoomId, setRentMetaByRoomId] = useState<Record<string, RoomRentMeta>>({});
  const [depositOverrides, setDepositOverrides] = useState<Record<string, RoomDepositOverride>>({});
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(() => !uid.startsWith('local-'));
  const [syncError, setSyncError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  const roomsRef = useRef(rooms);
  const rentMetaRef = useRef(rentMetaByRoomId);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    settingsRef.current = settings;
    roomsRef.current = rooms;
    rentMetaRef.current = rentMetaByRoomId;
    notificationsRef.current = notifications;
  }, [settings, rooms, rentMetaByRoomId, notifications]);

  const bootstrapAndSubscribe = useCallback(() => {
    if (uid.startsWith('local-')) {
      return () => {};
    }

    let active = true;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        await ensureUserWorkspaceInitialized(uid, {
          email: userEmail,
          fullName: userName,
        });
      } catch (err) {
        if (active) {
          setSyncError(getFriendlySyncError(err));
        }
      } finally {
        if (active) {
          setIsInitialLoading(false);
        }
      }

      if (!active) return;

      unsub = subscribeUserWorkspace(
        uid,
        { email: userEmail, fullName: userName },
        {
          onWorkspaceDoc: (nextProfile, nextSettings) => {
            setProfile(nextProfile);
            setSettings(nextSettings);
            setSyncError(null);
          },
          onRooms: (nextRooms) => {
            setRooms([...nextRooms].sort(sortRoomsByNumber));
          },
          onRentMeta: (nextRentMeta) => {
            setRentMetaByRoomId(nextRentMeta);
          },
          onDeposits: (nextDeposits) => {
            setDepositOverrides(nextDeposits);
          },
          onTransactions: (nextTransactions) => {
            setTransactions(nextTransactions);
          },
          onNotifications: (nextNotifications) => {
            setNotifications(nextNotifications);
          },
          onStaff: (nextStaff) => {
            setStaff(nextStaff);
          },
          onError: (err) => {
            setSyncError(getFriendlySyncError(err));
          },
        }
      );
    })();

    return () => {
      active = false;
      unsub?.();
    };
  }, [uid, userEmail, userName]);

  useEffect(() => {
    return bootstrapAndSubscribe();
  }, [bootstrapAndSubscribe]);

  const refreshWorkspace = useCallback(async () => {
    if (uid.startsWith('local-')) {
      setSyncError(null);
      return;
    }
    try {
      await ensureUserWorkspaceInitialized(uid, {
        email: userEmail,
        fullName: userName,
      });
      setSyncError(null);
    } catch (err) {
      setSyncError(getFriendlySyncError(err));
    }
  }, [uid, userEmail, userName]);

  const dismissSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const persistSafe = useCallback(
    async (action: () => Promise<void>) => {
      if (uid.startsWith('local-')) return;
      try {
        await action();
        setSyncError(null);
      } catch (err) {
        setSyncError(getFriendlySyncError(err));
      }
    },
    [uid]
  );

  const updateProfile = useCallback(
    async (next: OwnerProfile) => {
      setProfile(next);
      await persistSafe(() => saveOwnerProfile(uid, next));
    },
    [uid, persistSafe]
  );

  const updateSettings = useCallback(
    async (patch: Partial<WorkspaceSettings>) => {
      const prevCycle = settingsRef.current.rentCycleDay;
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      setSettings(next);

      const cycleChanged =
        typeof patch.rentCycleDay === 'string' &&
        patch.rentCycleDay.trim() !== '' &&
        patch.rentCycleDay !== prevCycle;

      const updatedMetaList: RoomRentMeta[] = [];
      if (cycleChanged) {
        const nextDay = extractCycleDayNumber(next.rentCycleDay);
        const currMeta = rentMetaRef.current;
        const nextMap: Record<string, RoomRentMeta> = { ...currMeta };
        for (const [rId, meta] of Object.entries(currMeta)) {
          const monthMatch = meta.dueDate.match(/^\d{1,2}\s+([A-Za-z]{3})\s+(\d{4})$/);
          if (monthMatch) {
            const updatedDueDate = `${nextDay} ${monthMatch[1]} ${monthMatch[2]}`;
            const updatedBadge =
              meta.currentStatus === 'Due'
                ? 'Due'
                : meta.statusBadgeText;
            const updatedMeta: RoomRentMeta = {
              ...meta,
              dueDate: updatedDueDate,
              statusBadgeText: updatedBadge,
            };
            nextMap[rId] = updatedMeta;
            updatedMetaList.push(updatedMeta);
          }
        }
        if (updatedMetaList.length > 0) {
          rentMetaRef.current = nextMap;
          setRentMetaByRoomId(nextMap);
        }
      }

      await persistSafe(async () => {
        await saveWorkspaceSettings(uid, next);
        for (const meta of updatedMetaList) {
          await upsertRentMeta(uid, meta);
        }
      });
    },
    [uid, persistSafe]
  );

  const setFloors: React.Dispatch<React.SetStateAction<string[]>> = useCallback(
    (updater) => {
      const nextFloors =
        typeof updater === 'function' ? updater(settingsRef.current.floors) : updater;
      void updateSettings({ floors: nextFloors });
    },
    [updateSettings]
  );

  const setRoomTypes: React.Dispatch<React.SetStateAction<string[]>> = useCallback(
    (updater) => {
      const nextTypes =
        typeof updater === 'function' ? updater(settingsRef.current.roomTypes) : updater;
      void updateSettings({ roomTypes: nextTypes });
    },
    [updateSettings]
  );

  const setMaintenanceReasons: React.Dispatch<React.SetStateAction<string[]>> = useCallback(
    (updater) => {
      const nextReasons =
        typeof updater === 'function'
          ? updater(settingsRef.current.maintenanceReasons)
          : updater;
      void updateSettings({ maintenanceReasons: nextReasons });
    },
    [updateSettings]
  );

  const upsertSingleRoom = useCallback(
    async (room: RoomItem) => {
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === room.id);
        const updated = exists ? prev.map((r) => (r.id === room.id ? room : r)) : [...prev, room];
        return updated.sort(sortRoomsByNumber);
      });
      await persistSafe(() => upsertRoom(uid, room));
    },
    [uid, persistSafe]
  );

  const addRooms = useCallback(
    async (newRooms: RoomItem[]) => {
      if (newRooms.length === 0) return;
      setRooms((prev) => [...prev, ...newRooms].sort(sortRoomsByNumber));
      await persistSafe(() => upsertRoomsBatch(uid, newRooms));
    },
    [uid, persistSafe]
  );

  const removeRoom = useCallback(
    async (room: RoomItem) => {
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      setRentMetaByRoomId((prev) => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
      setDepositOverrides((prev) => {
        const next = { ...prev };
        delete next[room.roomNumber];
        return next;
      });
      await persistSafe(() => deleteRoomAndRelated(uid, room.id, room.roomNumber));
    },
    [uid, persistSafe]
  );

  const setRoomsList: React.Dispatch<React.SetStateAction<RoomItem[]>> = useCallback(
    (updater) => {
      const prevRooms = roomsRef.current;
      const nextRooms = typeof updater === 'function' ? updater(prevRooms) : updater;
      const sorted = [...nextRooms].sort(sortRoomsByNumber);
      roomsRef.current = sorted;
      setRooms(sorted);

      void persistSafe(() => saveRoomsFullList(uid, sorted));
    },
    [uid, persistSafe]
  );

  const recordRentPayment = useCallback(
    async (input: RecordPaymentInput) => {
      const {
        room,
        paidNum,
        updatedAdvanceFormatted,
        updatedDueDate,
        isThisMonthSettled,
        newRecords,
        paymentDate,
        mode,
      } = input;

      const existingMeta = rentMetaRef.current[room.id];
      const nextMeta: RoomRentMeta = {
        roomId: room.id,
        maintenanceAmount: existingMeta?.maintenanceAmount ?? room.maintenanceAmount,
        advancePayment: updatedAdvanceFormatted,
        dueDate: updatedDueDate,
        paymentCycle: existingMeta?.paymentCycle ?? room.paymentCycle,
        currentStatus: isThisMonthSettled ? 'Paid' : room.currentStatus,
        statusBadgeText: isThisMonthSettled ? 'Paid' : room.statusBadgeText,
        history: [...newRecords, ...(existingMeta?.history ?? room.history)],
      };

      setRentMetaByRoomId((prev) => ({ ...prev, [room.id]: nextMeta }));

      const targetRoom = roomsRef.current.find((r) => r.id === room.id);
      let updatedRoom: RoomItem | null = null;
      if (targetRoom && isThisMonthSettled && targetRoom.status === 'Rent due') {
        updatedRoom = { ...targetRoom, status: 'Occupied' };
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom!.id ? updatedRoom! : r)));
      }

      const now = Date.now();
      const tx: TransactionItem = {
        id: `tx-rent-${now}`,
        kind: 'income',
        title: `Room rent (${room.roomNumber})`,
        subtitle: `${room.tenantName} · ${mode}`,
        amount: formatRupeeAmount(paidNum),
        numericAmount: paidNum,
        date: paymentDate,
        dateIso: parseShortDateToIso(paymentDate),
        createdAt: now,
        roomId: room.id,
      };
      setTransactions((prev) => [tx, ...prev]);

      const paymentNotice: NotificationItem = {
        id: `sys-pay-${now}`,
        type: 'system',
        title: `${room.tenantName} · ${room.roomNumber}`,
        roomNumber: room.roomNumber,
        senderName: room.tenantName,
        tag: 'Payment',
        message: `Received ${formatRupeeAmount(paidNum)} via ${mode} on ${paymentDate}.`,
        time: 'Just now',
        createdAt: now,
        isRead: false,
      };
      setNotifications((prev) => [paymentNotice, ...prev]);

      await persistSafe(() =>
        recordPaymentBatch(uid, nextMeta, updatedRoom, tx, paymentNotice)
      );
    },
    [uid, persistSafe]
  );

  const markRoomRentDue = useCallback(
    async (roomId: string) => {
      const targetRoom = roomsRef.current.find((r) => r.id === roomId);
      if (!targetRoom || targetRoom.status === 'Vacant') return;

      const existingMeta = rentMetaRef.current[roomId];
      const now = new Date();
      const currMonthShort = MONTHS_SHORT[now.getMonth()];
      const cycleDay = extractCycleDayNumber(settingsRef.current.rentCycleDay);

      const updatedRoom: RoomItem = { ...targetRoom, status: 'Rent due' };
      const nextMeta: RoomRentMeta = {
        roomId,
        maintenanceAmount: existingMeta?.maintenanceAmount ?? '₹2,000',
        advancePayment: existingMeta?.advancePayment ?? '₹0',
        dueDate: existingMeta?.dueDate ?? `${cycleDay} ${currMonthShort} ${now.getFullYear()}`,
        paymentCycle: existingMeta?.paymentCycle ?? 'Monthly',
        currentStatus: 'Due',
        statusBadgeText: 'Due',
        history: existingMeta?.history ?? [],
      };

      setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
      setRentMetaByRoomId((prev) => ({ ...prev, [roomId]: nextMeta }));

      await persistSafe(async () => {
        await upsertRoom(uid, updatedRoom);
        await upsertRentMeta(uid, nextMeta);
      });
    },
    [uid, persistSafe]
  );

  const saveDepositOverride = useCallback(
    async (roomNumber: string, override: RoomDepositOverride) => {
      setDepositOverrides((prev) => ({ ...prev, [roomNumber]: override }));
      await persistSafe(() => upsertDepositOverride(uid, roomNumber, override));
    },
    [uid, persistSafe]
  );

  const addTransaction = useCallback(
    async (input: AddTransactionInput) => {
      const dateObj = input.dateObj ?? new Date();
      const now = Date.now();
      const tx: TransactionItem = {
        id: `tx-${now}`,
        kind: input.kind,
        title: input.title,
        subtitle: input.subtitle,
        amount: formatRupeeAmount(input.numericAmount),
        numericAmount: input.numericAmount,
        date: formatShortDate(dateObj),
        dateIso: toIsoDate(dateObj),
        createdAt: now,
      };
      setTransactions((prev) => [tx, ...prev]);
      await persistSafe(() => upsertTransaction(uid, tx));
    },
    [uid, persistSafe]
  );

  const removeTransaction = useCallback(
    async (txId: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      await persistSafe(() => deleteTransaction(uid, txId));
    },
    [uid, persistSafe]
  );

  const addNotification = useCallback(
    async (input: AddNotificationInput) => {
      const now = Date.now();
      const notice: NotificationItem = {
        id: `${input.type === 'customer' ? 'msg' : 'sys'}-${now}`,
        type: input.type,
        title: `${input.senderName} · ${input.roomNumber}`,
        senderName: input.senderName,
        roomNumber: input.roomNumber,
        phone: input.phone,
        tag: input.tag,
        message: input.message,
        time: 'Just now',
        createdAt: now,
        isRead: false,
        priority: input.priority ?? 'Normal',
        status: input.status ?? 'Open',
        assignedStaff: input.assignedStaff,
      };
      setNotifications((prev) => [notice, ...prev]);
      await persistSafe(() => upsertNotification(uid, notice));
    },
    [uid, persistSafe]
  );

  const updateNotification = useCallback(
    async (noticeId: string, patch: Partial<NotificationItem>) => {
      const target = notificationsRef.current.find((n) => n.id === noticeId);
      if (!target) return;
      const updated = { ...target, ...patch };
      setNotifications((prev) => prev.map((n) => (n.id === noticeId ? updated : n)));
      await persistSafe(() => upsertNotification(uid, updated));
    },
    [uid, persistSafe]
  );

  const markNotificationRead = useCallback(
    async (noticeId: string) => {
      const target = notificationsRef.current.find((n) => n.id === noticeId);
      if (!target || target.isRead) return;
      const updated = { ...target, isRead: true };
      setNotifications((prev) => prev.map((n) => (n.id === noticeId ? updated : n)));
      await persistSafe(() => upsertNotification(uid, updated));
    },
    [uid, persistSafe]
  );

  const clearNotifications = useCallback(async () => {
    const ids = notificationsRef.current.map((n) => n.id);
    setNotifications([]);
    await persistSafe(() => clearAllNotificationsInDb(uid, ids));
  }, [uid, persistSafe]);

  const upsertStaff = useCallback(
    async (member: StaffMember) => {
      setStaff((prev) => {
        const exists = prev.some((s) => s.id === member.id);
        const next = exists ? prev.map((s) => (s.id === member.id ? member : s)) : [...prev, member];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      await persistSafe(() => upsertStaffMember(uid, member));
    },
    [uid, persistSafe]
  );

  const removeStaff = useCallback(
    async (staffId: string) => {
      setStaff((prev) => prev.filter((s) => s.id !== staffId));
      await persistSafe(() => deleteStaffMember(uid, staffId));
    },
    [uid, persistSafe]
  );

  const payStaffSalary = useCallback(
    async (member: StaffMember, amountNum?: number, dateObj?: Date) => {
      const payDate = dateObj ?? new Date();
      const paidDateStr = formatShortDate(payDate);
      const numericAmount = amountNum && amountNum > 0 ? amountNum : member.numericSalary;
      const now = Date.now();

      const updatedMember: StaffMember = {
        ...member,
        lastPaidDate: paidDateStr,
      };
      setStaff((prev) => prev.map((s) => (s.id === member.id ? updatedMember : s)));

      const tx: TransactionItem = {
        id: `tx-staff-${now}`,
        kind: 'expense',
        title: `Staff Salary (${member.name})`,
        subtitle: `${member.role} · ${member.shift}`,
        amount: formatRupeeAmount(numericAmount),
        numericAmount,
        date: paidDateStr,
        dateIso: toIsoDate(payDate),
        createdAt: now,
      };
      setTransactions((prev) => [tx, ...prev]);

      await persistSafe(async () => {
        await upsertStaffMember(uid, updatedMember);
        await upsertTransaction(uid, tx);
      });
    },
    [uid, persistSafe]
  );

  const loadSampleStaff = useCallback(async () => {
    setStaff(INITIAL_STAFF);
    await persistSafe(async () => {
      for (const member of INITIAL_STAFF) {
        await upsertStaffMember(uid, member);
      }
    });
  }, [uid, persistSafe]);

  const clearAllWorkspaceData = useCallback(async () => {
    setRooms([]);
    setRentMetaByRoomId({});
    setDepositOverrides({});
    setTransactions([]);
    setNotifications([]);
    setStaff([]);
    await persistSafe(() => clearWorkspaceRecords(uid));
  }, [uid, persistSafe]);

  const restoreSampleWorkspaceData = useCallback(async () => {
    const now = new Date();
    const nextRentMeta = createInitialRentMeta(now);
    const nextTx = createInitialTransactions(now);
    const nextNotices = createInitialNotifications(now);

    setRooms(INITIAL_ROOMS);
    setRentMetaByRoomId(nextRentMeta);
    setDepositOverrides({});
    setTransactions(nextTx);
    setNotifications(nextNotices);
    setStaff(INITIAL_STAFF);

    await persistSafe(async () => {
      await clearWorkspaceRecords(uid);
      await upsertRoomsBatch(uid, INITIAL_ROOMS);
      for (const meta of Object.values(nextRentMeta)) {
        await upsertRentMeta(uid, meta);
      }
      for (const tx of nextTx) {
        await upsertTransaction(uid, tx);
      }
      for (const notice of nextNotices) {
        await upsertNotification(uid, notice);
      }
      for (const member of INITIAL_STAFF) {
        await upsertStaffMember(uid, member);
      }
    });
  }, [uid, persistSafe]);

  const rentList = useMemo(
    () => deriveRoomRentList(rooms, rentMetaByRoomId, 'Monthly', settings.rentCycleDay),
    [rooms, rentMetaByRoomId, settings.rentCycleDay]
  );

  const dashboardMetrics = useMemo(
    () => computeDashboardMetrics(rooms, rentList, transactions),
    [rooms, rentList, transactions]
  );

  const value: AppDataContextValue = useMemo(
    () => ({
      uid,
      profile,
      settings,
      rooms,
      rentList,
      depositOverrides,
      transactions,
      notifications,
      staff,
      dashboardMetrics,
      isInitialLoading,
      syncError,
      dismissSyncError,
      refreshWorkspace,
      updateProfile,
      updateSettings,
      setFloors,
      setRoomTypes,
      setMaintenanceReasons,
      upsertSingleRoom,
      addRooms,
      setRoomsList,
      removeRoom,
      recordRentPayment,
      markRoomRentDue,
      saveDepositOverride,
      addTransaction,
      removeTransaction,
      addNotification,
      updateNotification,
      markNotificationRead,
      clearNotifications,
      upsertStaff,
      removeStaff,
      payStaffSalary,
      loadSampleStaff,
      clearAllWorkspaceData,
      restoreSampleWorkspaceData,
    }),
    [
      uid,
      profile,
      settings,
      rooms,
      rentList,
      depositOverrides,
      transactions,
      notifications,
      staff,
      dashboardMetrics,
      isInitialLoading,
      syncError,
      dismissSyncError,
      refreshWorkspace,
      updateProfile,
      updateSettings,
      setFloors,
      setRoomTypes,
      setMaintenanceReasons,
      upsertSingleRoom,
      addRooms,
      setRoomsList,
      removeRoom,
      recordRentPayment,
      markRoomRentDue,
      saveDepositOverride,
      addTransaction,
      removeTransaction,
      addNotification,
      updateNotification,
      markNotificationRead,
      clearNotifications,
      upsertStaff,
      removeStaff,
      payStaffSalary,
      loadSampleStaff,
      clearAllWorkspaceData,
      restoreSampleWorkspaceData,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return ctx;
}

