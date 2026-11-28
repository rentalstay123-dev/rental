import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialCustomerData,
  createInitialPropertyRules,
  createInitialResidentDocuments,
} from '../constants/customerInitialData';
import {
  ensureCustomerWorkspaceInitialized,
  saveCustomerWorkspace,
  subscribeCustomerWorkspace,
} from '../services/supabaseService';
import type {
  CustomerNotice,
  CustomerProfile,
  CustomerServiceRequest,
  CustomerWorkspaceData,
  DepositPaymentMode,
  PaymentMode,
  PaymentRecord,
  ResidentDocument,
  RoomDepositOverride,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '../types/appData';
import {
  formatRupeeAmount,
  formatShortDate,
  MONTHS_FULL,
  parseRupeeAmount,
} from '../utils/finance';

export interface CustomerPayRentInput {
  paidNum: number;
  mode: PaymentMode;
  referenceNote?: string;
}

export interface CreateServiceRequestInput {
  category: string;
  title: string;
  description: string;
  priority: ServiceRequestPriority;
  roomNumber?: string;
}

export interface AddDocumentInput {
  title: string;
  category: ResidentDocument['category'];
  fileType?: ResidentDocument['fileType'];
  description?: string;
}

interface CustomerDataContextValue {
  uid: string;
  data: CustomerWorkspaceData;
  isInitialLoading: boolean;
  syncError: string | null;
  dismissSyncError: () => void;
  refreshWorkspace: () => Promise<void>;
  payRent: (input: CustomerPayRentInput) => Promise<PaymentRecord>;
  payDeposit: (input: CustomerPayRentInput) => Promise<PaymentRecord>;
  unpayDeposit: () => Promise<void>;
  createServiceRequest: (input: CreateServiceRequestInput) => Promise<CustomerServiceRequest>;
  updateServiceRequestStatus: (requestId: string, status: ServiceRequestStatus) => Promise<void>;
  deleteServiceRequest: (requestId: string) => Promise<void>;
  markNoticeRead: (noticeId: string) => Promise<void>;
  markAllNoticesRead: () => Promise<void>;
  clearAllNotices: () => Promise<void>;
  updateCustomerProfile: (patch: Partial<CustomerProfile>) => Promise<void>;
  switchRoomSample: (roomNumber: string) => Promise<void>;
  addCustomerDocument: (input: AddDocumentInput) => Promise<ResidentDocument>;
}

const CustomerDataContext = createContext<CustomerDataContextValue | null>(null);

interface CustomerDataProviderProps {
  uid: string;
  userEmail?: string;
  userName?: string;
  children: React.ReactNode;
}

const getStorageKey = (uid: string) => `@luvora_customer_workspace_${uid}`;

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

export function CustomerDataProvider({
  uid,
  userEmail,
  userName,
  children,
}: CustomerDataProviderProps) {
  const [data, setData] = useState<CustomerWorkspaceData>(() =>
    createInitialCustomerData({ email: userEmail, fullName: userName })
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const persistData = useCallback(
    async (next: CustomerWorkspaceData) => {
      try {
        await AsyncStorage.setItem(getStorageKey(uid), JSON.stringify(next));
      } catch {
        // Ignore local cache write failures
      }
      if (uid.startsWith('local-')) return;
      try {
        await saveCustomerWorkspace(uid, next);
      } catch (err) {
        setSyncError(getFriendlySyncError(err));
      }
    },
    [uid]
  );

  useEffect(() => {
    let isMounted = true;
    let unsub: (() => void) | undefined;

    const depositIsUnpaid = (deposit?: CustomerWorkspaceData['deposit']) => {
      if (!deposit) return false;
      const status = String(deposit.status || '').toLowerCase();
      return status !== 'held' && status !== 'paid';
    };

    const bootstrap = async () => {
      const resetKey = `@luvora_deposit_unpaid_test_v1_${uid}`;
      const needsDepositUnpay = !(await AsyncStorage.getItem(resetKey).catch(() => null));

      try {
        const cachedRaw = await AsyncStorage.getItem(getStorageKey(uid));
        if (cachedRaw && isMounted) {
          const parsed = JSON.parse(cachedRaw) as CustomerWorkspaceData;
          if (parsed?.room && parsed?.profile) {
            if (needsDepositUnpay && depositIsUnpaid(parsed.deposit)) {
              parsed.deposit = {
                ...parsed.deposit,
                status: 'Due',
                dateReceived: '',
                history: [],
              };
              if (parsed.rentMeta?.history) {
                parsed.rentMeta.history = parsed.rentMeta.history.filter(
                  (h) =>
                    !h.title.toLowerCase().includes('deposit') &&
                    !h.id.toLowerCase().includes('dep')
                );
              }
              await AsyncStorage.setItem(getStorageKey(uid), JSON.stringify(parsed)).catch(() => {});
              await AsyncStorage.setItem(resetKey, 'true').catch(() => {});
            }
            if (!parsed.rules || parsed.rules.length === 0) {
              parsed.rules = createInitialPropertyRules();
            }
            if (!parsed.documents || parsed.documents.length === 0) {
              parsed.documents = createInitialResidentDocuments(parsed.room?.roomNumber);
            }
            setData(parsed);
          }
        }
      } catch {
        // Ignore cache read error
      }

      if (uid.startsWith('local-')) {
        if (isMounted) setIsInitialLoading(false);
        return;
      }

      try {
        const initialized = await ensureCustomerWorkspaceInitialized(uid, {
          email: userEmail,
          fullName: userName,
        });
        if (isMounted) {
          if (needsDepositUnpay && depositIsUnpaid(initialized.deposit)) {
            initialized.deposit = {
              ...initialized.deposit,
              status: 'Due',
              dateReceived: '',
              history: [],
            };
            if (initialized.rentMeta?.history) {
              initialized.rentMeta.history = initialized.rentMeta.history.filter(
                (h) =>
                  !h.title.toLowerCase().includes('deposit') &&
                  !h.id.toLowerCase().includes('dep')
              );
            }
            await saveCustomerWorkspace(uid, initialized).catch(() => {});
            await AsyncStorage.setItem(getStorageKey(uid), JSON.stringify(initialized)).catch(() => {});
            await AsyncStorage.setItem(resetKey, 'true').catch(() => {});
          }
          if (!initialized.rules || initialized.rules.length === 0) {
            initialized.rules = createInitialPropertyRules();
          }
          if (!initialized.documents || initialized.documents.length === 0) {
            initialized.documents = createInitialResidentDocuments(initialized.room?.roomNumber);
          }
          setData(initialized);
        }
      } catch (err) {
        if (isMounted) {
          setSyncError(getFriendlySyncError(err));
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }

      unsub = subscribeCustomerWorkspace(
        uid,
        { email: userEmail, fullName: userName },
        (remote) => {
          if (!isMounted) return;
          if (!remote.rules || remote.rules.length === 0) {
            remote.rules = createInitialPropertyRules();
          }
          if (!remote.documents || remote.documents.length === 0) {
            remote.documents = createInitialResidentDocuments(remote.room?.roomNumber);
          }
          setData(remote);
          void AsyncStorage.setItem(getStorageKey(uid), JSON.stringify(remote)).catch(() => {});
        },
        (err) => {
          if (!isMounted) return;
          setSyncError(getFriendlySyncError(err));
        }
      );
    };

    void bootstrap();

    return () => {
      isMounted = false;
      unsub?.();
    };
  }, [uid, userEmail, userName]);

  const dismissSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (uid.startsWith('local-')) {
      setSyncError(null);
      return;
    }
    try {
      const fresh = await ensureCustomerWorkspaceInitialized(uid, {
        email: userEmail,
        fullName: userName,
      });
      setData(fresh);
      setSyncError(null);
    } catch (err) {
      setSyncError(getFriendlySyncError(err));
    }
  }, [uid, userEmail, userName]);

  const payRent = useCallback(
    async ({ paidNum, mode, referenceNote }: CustomerPayRentInput): Promise<PaymentRecord> => {
      const current = dataRef.current;
      const now = new Date();
      const dateStr = formatShortDate(now);
      const monthLabel = `${MONTHS_FULL[now.getMonth()]} Rent`;

      const isAlreadyPaid = current.rentMeta.currentStatus === 'Paid';
      const monthlyBase = parseRupeeAmount(current.room.monthlyRent);
      const currentAdvance = parseRupeeAmount(current.rentMeta.advancePayment);
      const nextAdvanceTotal = isAlreadyPaid
        ? currentAdvance + paidNum
        : currentAdvance + Math.max(0, paidNum - monthlyBase);

      const recordTitle = referenceNote?.trim()
        ? referenceNote.trim()
        : isAlreadyPaid
        ? 'Advance Rent Payment'
        : monthLabel;

      const record: PaymentRecord = {
        id: `cpay-${now.getTime()}`,
        title: recordTitle,
        amount: formatRupeeAmount(paidNum),
        date: dateStr,
        status: 'Paid',
        method: mode,
      };

      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextDueDate = formatShortDate(nextMonth);

      const newNotice: CustomerNotice = {
        id: `cnot-pay-${now.getTime()}`,
        category: 'Billing',
        title: isAlreadyPaid
          ? `Advance Rent Paid · ${current.room.roomNumber}`
          : `Rent Paid · ${current.room.roomNumber}`,
        message: isAlreadyPaid
          ? `Advance payment of ${formatRupeeAmount(paidNum)} via ${mode} credited on ${dateStr}.`
          : `Payment of ${formatRupeeAmount(paidNum)} via ${mode} confirmed on ${dateStr}.`,
        timeLabel: 'Just now',
        createdAt: now.getTime(),
        isRead: false,
      };

      const next: CustomerWorkspaceData = {
        ...current,
        room: {
          ...current.room,
          status: 'Occupied',
        },
        rentMeta: {
          ...current.rentMeta,
          currentStatus: 'Paid',
          statusBadgeText: 'Paid',
          dueDate: nextDueDate,
          advancePayment: formatRupeeAmount(nextAdvanceTotal),
          history: [record, ...current.rentMeta.history],
        },
        notices: [newNotice, ...current.notices],
      };

      setData(next);
      await persistData(next);
      return record;
    },
    [persistData]
  );

  const payDeposit = useCallback(
    async ({ paidNum, mode, referenceNote }: CustomerPayRentInput): Promise<PaymentRecord> => {
      const current = dataRef.current;
      const now = new Date();
      const dateStr = formatShortDate(now);
      const title = referenceNote?.trim()
        ? `Security Deposit (${referenceNote.trim()})`
        : 'Security Deposit';

      const record: PaymentRecord = {
        id: `cdep-pay-${now.getTime()}`,
        title,
        amount: formatRupeeAmount(paidNum),
        date: dateStr,
        status: 'Paid',
        method: mode,
      };

      const newNotice: CustomerNotice = {
        id: `cnot-dep-${now.getTime()}`,
        category: 'Billing',
        title: `Security Deposit Paid · ${current.room.roomNumber}`,
        message: `Security deposit of ${formatRupeeAmount(paidNum)} via ${mode} received and held on ${dateStr}.`,
        timeLabel: 'Just now',
        createdAt: now.getTime(),
        isRead: false,
      };

      const nextDeposit = {
        ...current.deposit,
        amount: formatRupeeAmount(paidNum),
        numericAmount: paidNum,
        dateReceived: dateStr,
        paymentMode: mode as DepositPaymentMode,
        status: 'Held' as const,
        history: [
          {
            id: `dep-hist-${now.getTime()}`,
            title: 'Security Deposit Paid',
            amount: formatRupeeAmount(paidNum),
            date: dateStr,
            mode: mode as DepositPaymentMode,
            note: referenceNote?.trim() || 'Refundable upon move-out inspection',
          },
          ...(current.deposit?.history || []),
        ],
      };

      const next: CustomerWorkspaceData = {
        ...current,
        deposit: nextDeposit,
        rentMeta: {
          ...current.rentMeta,
          history: [record, ...current.rentMeta.history],
        },
        notices: [newNotice, ...current.notices],
      };

      setData(next);
      await persistData(next);
      return record;
    },
    [persistData]
  );

  const unpayDeposit = useCallback(async () => {
    const current = dataRef.current;
    const nextDeposit: RoomDepositOverride = {
      ...current.deposit,
      status: 'Due',
      dateReceived: '',
      history: [],
    };

    const nextRentHistory = current.rentMeta.history.filter(
      (h) =>
        !h.title.toLowerCase().includes('deposit') &&
        !h.id.toLowerCase().includes('dep')
    );

    const next: CustomerWorkspaceData = {
      ...current,
      deposit: nextDeposit,
      rentMeta: {
        ...current.rentMeta,
        history: nextRentHistory,
      },
    };

    setData(next);
    await persistData(next);
  }, [persistData]);

  const createServiceRequest = useCallback(
    async ({
      category,
      title,
      description,
      priority,
      roomNumber,
    }: CreateServiceRequestInput): Promise<CustomerServiceRequest> => {
      const current = dataRef.current;
      const now = new Date();
      const targetRoom = roomNumber?.trim() || current.room.roomNumber;
      const newReq: CustomerServiceRequest = {
        id: `creq-${now.getTime()}`,
        category: category.trim(),
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'Open',
        createdAt: now.getTime(),
        timeLabel: 'Just now',
        roomNumber: targetRoom,
        ownerNote: 'Submitted to property manager for review.',
      };

      const confirmationNotice: CustomerNotice = {
        id: `cnotif-req-${now.getTime()}`,
        category: category.toLowerCase().includes('billing')
          ? 'Billing'
          : category.toLowerCase().includes('maint') || category.toLowerCase().includes('clean')
          ? 'Maintenance'
          : 'Property',
        title: `Request: ${title.trim()}`,
        message: `Your request (${category.trim()} · ${priority}) has been delivered for ${targetRoom}.`,
        timeLabel: 'Just now',
        createdAt: now.getTime(),
        isRead: false,
      };

      const next: CustomerWorkspaceData = {
        ...current,
        requests: [newReq, ...current.requests],
        notices: [confirmationNotice, ...current.notices],
      };

      setData(next);
      await persistData(next);
      return newReq;
    },
    [persistData]
  );

  const updateServiceRequestStatus = useCallback(
    async (requestId: string, status: ServiceRequestStatus) => {
      const current = dataRef.current;
      const next: CustomerWorkspaceData = {
        ...current,
        requests: current.requests.map((req) =>
          req.id === requestId ? { ...req, status } : req
        ),
      };
      setData(next);
      await persistData(next);
    },
    [persistData]
  );

  const deleteServiceRequest = useCallback(
    async (requestId: string) => {
      const current = dataRef.current;
      const next: CustomerWorkspaceData = {
        ...current,
        requests: current.requests.filter((req) => req.id !== requestId),
      };
      setData(next);
      await persistData(next);
    },
    [persistData]
  );

  const markNoticeRead = useCallback(
    async (noticeId: string) => {
      const current = dataRef.current;
      const target = current.notices.find((n) => n.id === noticeId);
      if (!target || target.isRead) return;
      const next: CustomerWorkspaceData = {
        ...current,
        notices: current.notices.map((n) =>
          n.id === noticeId ? { ...n, isRead: true } : n
        ),
      };
      setData(next);
      await persistData(next);
    },
    [persistData]
  );

  const markAllNoticesRead = useCallback(async () => {
    const current = dataRef.current;
    if (!current.notices.some((n) => !n.isRead)) return;
    const next: CustomerWorkspaceData = {
      ...current,
      notices: current.notices.map((n) => ({ ...n, isRead: true })),
    };
    setData(next);
    await persistData(next);
  }, [persistData]);

  const clearAllNotices = useCallback(async () => {
    const current = dataRef.current;
    if (current.notices.length === 0) return;
    const next: CustomerWorkspaceData = {
      ...current,
      notices: [],
    };
    setData(next);
    await persistData(next);
  }, [persistData]);

  const updateCustomerProfile = useCallback(
    async (patch: Partial<CustomerProfile>) => {
      const current = dataRef.current;
      const updatedProfile: CustomerProfile = {
        ...current.profile,
        ...patch,
      };
      const updatedMembers = current.room.members.map((m, idx) =>
        idx === 0
          ? {
              ...m,
              name: updatedProfile.fullName,
              phone: updatedProfile.phone,
            }
          : m
      );
      const next: CustomerWorkspaceData = {
        ...current,
        profile: updatedProfile,
        room: {
          ...current.room,
          members: updatedMembers,
        },
      };
      setData(next);
      await persistData(next);
    },
    [persistData]
  );

  const switchRoomSample = useCallback(
    async (roomNumber: string) => {
      const fresh = createInitialCustomerData({
        email: dataRef.current.profile.email,
        fullName: dataRef.current.profile.fullName,
        roomNumber,
        propertyName: dataRef.current.profile.propertyName,
      });
      setData(fresh);
      await persistData(fresh);
    },
    [persistData]
  );

  const addCustomerDocument = useCallback(
    async (input: AddDocumentInput): Promise<ResidentDocument> => {
      const current = dataRef.current;
      const roomNum = current.room?.roomNumber || 'Room';
      const cleanRef = `DOC-${roomNum.replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`;
      const newDoc: ResidentDocument = {
        id: `doc-${Date.now()}`,
        title: input.title.trim(),
        category: input.category,
        fileType: input.fileType || 'PDF',
        fileSize: '1.2 MB',
        status: 'Uploaded',
        uploadedDate: formatShortDate(new Date()),
        referenceNumber: cleanRef,
        description: input.description?.trim() || 'Uploaded resident document.',
      };
      const next: CustomerWorkspaceData = {
        ...current,
        documents: [newDoc, ...(current.documents ?? [])],
      };
      setData(next);
      await persistData(next);
      return newDoc;
    },
    [persistData]
  );

  const value = useMemo<CustomerDataContextValue>(
    () => ({
      uid,
      data,
      isInitialLoading,
      syncError,
      dismissSyncError,
      refreshWorkspace,
      payRent,
      payDeposit,
      unpayDeposit,
      createServiceRequest,
      updateServiceRequestStatus,
      deleteServiceRequest,
      markNoticeRead,
      markAllNoticesRead,
      clearAllNotices,
      updateCustomerProfile,
      switchRoomSample,
      addCustomerDocument,
    }),
    [
      uid,
      data,
      isInitialLoading,
      syncError,
      dismissSyncError,
      refreshWorkspace,
      payRent,
      payDeposit,
      unpayDeposit,
      createServiceRequest,
      updateServiceRequestStatus,
      deleteServiceRequest,
      markNoticeRead,
      markAllNoticesRead,
      clearAllNotices,
      updateCustomerProfile,
      switchRoomSample,
      addCustomerDocument,
    ]
  );

  return (
    <CustomerDataContext.Provider value={value}>{children}</CustomerDataContext.Provider>
  );
}

export function useCustomerData(): CustomerDataContextValue {
  const ctx = useContext(CustomerDataContext);
  if (!ctx) {
    throw new Error('useCustomerData must be used inside CustomerDataProvider');
  }
  return ctx;
}

