import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type {
  DepositHistoryEntry,
  DepositPaymentMode,
  DepositStatus,
  RoomDepositOverride,
  RoomItem,
} from '../../types/appData';
import { formatShortDate } from '../../utils/finance';
import { sortRoomNumbers } from './RoomsView';

const DEPOSITS_CARD_BG = require('../../../assets/accounts-card-bg.jpg');

interface DepositsViewProps {
  onBack?: () => void;
  rooms?: RoomItem[];
}

export type { DepositStatus };
type DepositFilter = 'All' | 'Held' | 'Refunded';

interface ResolvedRoomDeposit {
  room: RoomItem;
  residentName: string;
  amount: string;
  numericAmount: number;
  deductedAmount: string;
  numericDeducted: number;
  standardDeposit: string;
  dateReceived: string;
  dateRefunded?: string;
  paymentMode: DepositPaymentMode;
  status: DepositStatus;
  history: DepositHistoryEntry[];
}

const PAYMENT_MODES: DepositPaymentMode[] = ['UPI', 'Bank Transfer', 'Cash', 'Net Banking'];

let nextDepositSeq = 200;
const getNextDepositHistoryId = () => `dep-h-${Date.now()}-${++nextDepositSeq}`;

function parseRupeeAmount(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

function formatRupeeAmount(amount: number): string {
  return `₹${Math.max(0, amount).toLocaleString('en-IN')}`;
}

function getDepositStatusColor(status: DepositStatus): string {
  switch (status) {
    case 'Held':
      return Palette.status.paid.text;
    case 'Refunded':
      return Palette.primary;
    case 'No Deposit':
    default:
      return Palette.textSecondary;
  }
}

export default function DepositsView({ onBack, rooms: propRooms }: DepositsViewProps) {
  const {
    rooms: contextRooms,
    depositOverrides: overrides,
    saveDepositOverride,
    refreshWorkspace,
  } = useAppData();

  const sourceRooms = propRooms ?? contextRooms;

  const [filter, setFilter] = useState<DepositFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);

  // Collect / Refund / Deduct Modal State
  const [actionModalMode, setActionModalMode] = useState<'collect' | 'refund' | 'deduct' | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [modalMode, setModalMode] = useState<DepositPaymentMode>('Bank Transfer');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const roomDeposits: ResolvedRoomDeposit[] = [...sourceRooms]
    .sort(sortRoomNumbers)
    .map((room) => {
      const existingOverride = overrides[room.roomNumber];
      const primaryResident = room.members[0]?.name;
      const residentName =
        room.status === 'Vacant' || !primaryResident ? 'Vacant' : primaryResident;

      if (existingOverride) {
        return {
          room,
          residentName,
          amount: existingOverride.amount,
          numericAmount: existingOverride.numericAmount,
          deductedAmount: existingOverride.deductedAmount,
          numericDeducted: existingOverride.numericDeducted,
          standardDeposit: room.depositAmount,
          dateReceived: existingOverride.dateReceived,
          dateRefunded: existingOverride.dateRefunded,
          paymentMode: existingOverride.paymentMode,
          status: existingOverride.status,
          history: existingOverride.history,
        };
      }

      const isOccupied = room.status !== 'Vacant';
      const defaultNumeric = isOccupied ? parseRupeeAmount(room.depositAmount) : 0;
      const defaultAmount = isOccupied ? formatRupeeAmount(defaultNumeric) : '₹0';
      const defaultDate = isOccupied ? room.joinedDate || formatShortDate() : '—';
      const defaultMode: DepositPaymentMode = 'Bank Transfer';

      return {
        room,
        residentName,
        amount: defaultAmount,
        numericAmount: defaultNumeric,
        deductedAmount: '₹0',
        numericDeducted: 0,
        standardDeposit: room.depositAmount,
        dateReceived: defaultDate,
        paymentMode: defaultMode,
        status: isOccupied ? 'Held' : 'No Deposit',
        history: isOccupied
          ? [
              {
                id: `init-${room.id}`,
                title: 'Security Deposit Received',
                amount: defaultAmount,
                date: defaultDate,
                mode: defaultMode,
              },
            ]
          : [],
      };
    });

  const heldRooms = roomDeposits.filter((d) => d.status === 'Held');
  const totalHeldAmount = heldRooms.reduce((acc, d) => acc + d.numericAmount, 0);
  const refundedRooms = roomDeposits.filter((d) => d.status === 'Refunded');
  const totalRefundedAmount = refundedRooms.reduce((acc, d) => acc + d.numericAmount, 0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRooms = roomDeposits.filter((item) => {
    const matchesFilter = filter === 'All' ? true : item.status === filter;
    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;
    return (
      item.room.roomNumber.toLowerCase().includes(normalizedQuery) ||
      item.residentName.toLowerCase().includes(normalizedQuery) ||
      item.room.wing.toLowerCase().includes(normalizedQuery) ||
      item.status.toLowerCase().includes(normalizedQuery)
    );
  });

  const selectedDeposit =
    selectedRoomNumber !== null
      ? roomDeposits.find((d) => d.room.roomNumber === selectedRoomNumber) ?? null
      : null;

  const openActionModal = (
    mode: 'collect' | 'refund' | 'deduct',
    target: ResolvedRoomDeposit
  ) => {
    const initialNum =
      mode === 'refund'
        ? target.numericAmount
        : mode === 'collect'
          ? parseRupeeAmount(target.standardDeposit)
          : 0;
    setActionModalMode(mode);
    setAmountInput(initialNum > 0 ? String(initialNum) : '');
    setModalMode(target.paymentMode);
    setShowModeDropdown(false);
    setNoteInput('');
    setModalError(null);
  };

  const closeActionModal = () => {
    setShowModeDropdown(false);
    setActionModalMode(null);
    setModalError(null);
  };

  const handleSubmitActionModal = () => {
    if (!selectedDeposit || !actionModalMode) return;
    const cleanNum = parseRupeeAmount(amountInput);
    if (cleanNum <= 0) {
      setModalError('Please enter a valid amount.');
      return;
    }

    const formatted = formatRupeeAmount(cleanNum);
    const cleanNote = noteInput.trim();
    const roomKey = selectedDeposit.room.roomNumber;
    const todayFormatted = formatShortDate();

    if (actionModalMode === 'deduct') {
      if (cleanNum > selectedDeposit.numericAmount) {
        setModalError(
          `Deduction cannot exceed current deposit held (${selectedDeposit.amount}).`
        );
        return;
      }
      if (!cleanNote) {
        setModalError('Please enter a reason for this deposit deduction.');
        return;
      }

      const remainingNumeric = selectedDeposit.numericAmount - cleanNum;
      const remainingFormatted = formatRupeeAmount(remainingNumeric);
      const nextDeductedNumeric = selectedDeposit.numericDeducted + cleanNum;
      const nextDeductedFormatted = formatRupeeAmount(nextDeductedNumeric);

      const entry: DepositHistoryEntry = {
        id: getNextDepositHistoryId(),
        title: 'Deposit Deduction',
        amount: `- ${formatted}`,
        date: todayFormatted,
        mode: 'Deduction',
        note: cleanNote,
      };

      const nextOverride: RoomDepositOverride = {
        roomId: selectedDeposit.room.id,
        roomNumber: roomKey,
        amount: remainingFormatted,
        numericAmount: remainingNumeric,
        deductedAmount: nextDeductedFormatted,
        numericDeducted: nextDeductedNumeric,
        dateReceived: selectedDeposit.dateReceived,
        dateRefunded: selectedDeposit.dateRefunded,
        paymentMode: selectedDeposit.paymentMode,
        status: remainingNumeric > 0 ? 'Held' : 'No Deposit',
        history: [entry, ...selectedDeposit.history],
      };

      void saveDepositOverride(roomKey, nextOverride);
      setNoticeText(
        `Deducted ${formatted} from ${roomKey} (${cleanNote}). Remaining deposit: ${remainingFormatted}.`
      );
      closeActionModal();
      return;
    }

    if (actionModalMode === 'refund') {
      const entry: DepositHistoryEntry = {
        id: getNextDepositHistoryId(),
        title: 'Security Deposit Refunded',
        amount: formatted,
        date: todayFormatted,
        mode: modalMode,
        note: cleanNote || undefined,
      };
      const nextOverride: RoomDepositOverride = {
        roomId: selectedDeposit.room.id,
        roomNumber: roomKey,
        amount: formatted,
        numericAmount: cleanNum,
        deductedAmount: selectedDeposit.deductedAmount,
        numericDeducted: selectedDeposit.numericDeducted,
        dateReceived: selectedDeposit.dateReceived,
        dateRefunded: todayFormatted,
        paymentMode: modalMode,
        status: 'Refunded',
        history: [entry, ...selectedDeposit.history],
      };
      void saveDepositOverride(roomKey, nextOverride);
      setNoticeText(`Deposit for ${roomKey} marked as Refunded (${formatted}).`);
    } else {
      const entry: DepositHistoryEntry = {
        id: getNextDepositHistoryId(),
        title: 'Security Deposit Collected',
        amount: formatted,
        date: todayFormatted,
        mode: modalMode,
        note: cleanNote || undefined,
      };
      const nextOverride: RoomDepositOverride = {
        roomId: selectedDeposit.room.id,
        roomNumber: roomKey,
        amount: formatted,
        numericAmount: cleanNum,
        deductedAmount: '₹0',
        numericDeducted: 0,
        dateReceived: todayFormatted,
        dateRefunded: undefined,
        paymentMode: modalMode,
        status: 'Held',
        history: [entry, ...selectedDeposit.history],
      };
      void saveDepositOverride(roomKey, nextOverride);
      setNoticeText(`Deposit of ${formatted} recorded for ${roomKey}.`);
    }

    closeActionModal();
  };

  const actionModal = (
    <Modal
      visible={actionModalMode !== null && selectedDeposit !== null}
      transparent
      animationType="fade"
      onRequestClose={closeActionModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetOverlay}
      >
        <TouchableWithoutFeedback onPress={closeActionModal}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetModalCard}>
          <View style={styles.sheetModalHeader}>
            <Text style={styles.sheetModalTitle}>
              {actionModalMode === 'deduct'
                ? 'Deposit Deduction'
                : actionModalMode === 'refund'
                  ? 'Process Deposit Refund'
                  : 'Record Security Deposit'}
            </Text>
            <TouchableOpacity onPress={closeActionModal}>
              <Feather name="x" size={Typography.iconSize.base} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          {selectedDeposit ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View style={styles.roomBanner}>
                <View style={styles.roomBannerInfo}>
                  <Text style={styles.roomBannerTitle}>{selectedDeposit.room.roomNumber}</Text>
                  <Text style={styles.roomBannerSub}>
                    {selectedDeposit.residentName} · {selectedDeposit.room.wing}
                  </Text>
                </View>
                {actionModalMode === 'deduct' ? (
                  <Text style={[styles.statusTextPlain, { color: Palette.primary }]}>
                    Held: {selectedDeposit.amount}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>
                {actionModalMode === 'deduct' ? 'Deduction Amount (₹)' : 'Amount (₹)'}
              </Text>
              <View style={styles.inputBox}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.textInput}
                  value={amountInput}
                  onChangeText={(txt) => {
                    setAmountInput(txt);
                    if (modalError) setModalError(null);
                  }}
                  keyboardType="numeric"
                  placeholder={actionModalMode === 'deduct' ? '2,000' : '18,000'}
                  placeholderTextColor={Palette.textMuted}
                />
              </View>
              {actionModalMode === 'deduct' && parseRupeeAmount(amountInput) > 0 ? (
                <Text style={styles.previewHintText}>
                  {parseRupeeAmount(amountInput) <= selectedDeposit.numericAmount
                    ? `Remaining deposit after deduction: ${formatRupeeAmount(
                        selectedDeposit.numericAmount - parseRupeeAmount(amountInput)
                      )}`
                    : `Exceeds deposit held (${selectedDeposit.amount})`}
                </Text>
              ) : null}

              {actionModalMode !== 'deduct' ? (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Payment Mode</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    activeOpacity={0.75}
                    onPress={() => setShowModeDropdown((prev) => !prev)}
                  >
                    <Text style={styles.selectValue}>{modalMode}</Text>
                    <Feather
                      name={showModeDropdown ? 'chevron-up' : 'chevron-down'}
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </TouchableOpacity>

                  {showModeDropdown && (
                    <View style={styles.modeDropdown}>
                      {PAYMENT_MODES.map((mode, idx) => {
                        const isSelected = mode === modalMode;
                        return (
                          <TouchableOpacity
                            key={mode}
                            style={[
                              styles.modeOption,
                              idx > 0 && styles.modeOptionBorder,
                              isSelected && styles.modeOptionActive,
                            ]}
                            onPress={() => {
                              setModalMode(mode);
                              setShowModeDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.modeOptionText,
                                isSelected && styles.modeOptionTextActive,
                              ]}
                            >
                              {mode}
                            </Text>
                            {isSelected && (
                              <Feather
                                name="check"
                                size={Typography.iconSize.sm}
                                color={Palette.primary}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : null}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                {actionModalMode === 'deduct' ? 'Reason *' : 'Note (Optional)'}
              </Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={noteInput}
                  onChangeText={(txt) => {
                    setNoteInput(txt);
                    if (modalError) setModalError(null);
                  }}
                  placeholder={
                    actionModalMode === 'deduct'
                      ? 'e.g. Wall painting / damage repair / pending bill'
                      : actionModalMode === 'refund'
                        ? 'e.g. Returned after inspection'
                        : 'e.g. Initial security deposit'
                  }
                  placeholderTextColor={Palette.textMuted}
                />
              </View>

              {modalError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{modalError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.85}
                onPress={handleSubmitActionModal}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {actionModalMode === 'deduct'
                    ? 'Deduct Deposit'
                    : actionModalMode === 'refund'
                      ? 'Confirm Refund'
                      : 'Save Deposit'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // --- SUB-SCREEN: SELECTED ROOM DEPOSIT ---
  if (selectedDeposit) {
    const statusColor = getDepositStatusColor(selectedDeposit.status);
    const isHeld = selectedDeposit.status === 'Held';
    const isRefunded = selectedDeposit.status === 'Refunded';

    const detailRows: {
      key: string;
      label: string;
      value: string;
      valueColor?: string;
    }[] = [
      { key: 'resident', label: 'Resident', value: selectedDeposit.residentName },
      { key: 'wing', label: 'Location', value: selectedDeposit.room.wing },
      { key: 'type', label: 'Room Type', value: selectedDeposit.room.type },
      {
        key: 'amount',
        label: isHeld ? 'Deposit Held' : isRefunded ? 'Refunded Amount' : 'Standard Deposit',
        value: isHeld || isRefunded ? selectedDeposit.amount : selectedDeposit.standardDeposit,
      },
      ...(selectedDeposit.numericDeducted > 0
        ? [
            {
              key: 'deducted',
              label: 'Total Deducted',
              value: selectedDeposit.deductedAmount,
              valueColor: Palette.status.overdue.text,
            },
          ]
        : []),
      { key: 'date', label: 'Received Date', value: selectedDeposit.dateReceived },
      ...(isRefunded && selectedDeposit.dateRefunded
        ? [
            {
              key: 'refundedDate',
              label: 'Refunded Date',
              value: selectedDeposit.dateRefunded,
            },
          ]
        : []),
      { key: 'mode', label: 'Payment Mode', value: selectedDeposit.paymentMode },
      {
        key: 'status',
        label: 'Status',
        value: selectedDeposit.status,
        valueColor: statusColor,
      },
    ];

    return (
      <View style={styles.outerScreen}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.container}
        >
          <View style={styles.contentWrapper}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.backButtonCircle}
                  onPress={() => {
                    setSelectedRoomNumber(null);
                    setNoticeText(null);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Deposit room list"
                >
                  <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{selectedDeposit.room.roomNumber} - Deposit</Text>
              </View>
            </View>

            {noticeText ? (
              <View style={styles.noticeBanner}>
                <Text style={styles.noticeBannerText}>{noticeText}</Text>
                <TouchableOpacity onPress={() => setNoticeText(null)}>
                  <Text style={styles.noticeDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Room Deposit Summary Card */}
            <View style={styles.detailsCard}>
              <View style={styles.roomBanner}>
                <View style={styles.roomBannerInfo}>
                  <Text style={styles.roomBannerTitle}>{selectedDeposit.room.roomNumber}</Text>
                  <Text style={styles.roomBannerSub}>
                    {selectedDeposit.residentName} · {selectedDeposit.room.wing}
                  </Text>
                </View>
                <Text style={[styles.statusTextPlain, { color: statusColor }]}>
                  {selectedDeposit.status}
                </Text>
              </View>

              {detailRows.map((row, idx) => (
                <React.Fragment key={row.key}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        row.valueColor ? { color: row.valueColor } : undefined,
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                  {idx < detailRows.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}

              {/* Room Deposit Actions */}
              <View style={styles.detailActionsRow}>
                {isHeld ? (
                  <>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      activeOpacity={0.75}
                      onPress={() => openActionModal('deduct', selectedDeposit)}
                    >
                      <Text style={styles.secondaryBtnText}>Deposit Deduction</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      activeOpacity={0.85}
                      onPress={() => openActionModal('refund', selectedDeposit)}
                    >
                      <Text style={styles.primaryBtnText}>Process Refund</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.85}
                    onPress={() => openActionModal('collect', selectedDeposit)}
                  >
                    <Text style={styles.primaryBtnText}>Record Deposit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Deposit History */}
            <Text style={styles.sectionTitle}>Deposit History</Text>
            <View style={styles.listCard}>
              {selectedDeposit.history.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptySearchText}>
                    No deposit recorded for {selectedDeposit.room.roomNumber}.
                  </Text>
                </View>
              ) : (
                selectedDeposit.history.map((entry, idx) => {
                  const isDeduction = entry.mode === 'Deduction';
                  const isRefundEntry = entry.title.toLowerCase().includes('refund');
                  return (
                    <React.Fragment key={entry.id}>
                      {idx > 0 && <View style={styles.divider} />}
                      <View style={styles.historyRow}>
                        <View style={styles.historyIconBox}>
                          <Feather
                            name={isDeduction ? 'minus-circle' : isRefundEntry ? 'rotate-ccw' : 'check'}
                            size={Typography.iconSize.sm}
                            color={isDeduction ? Palette.status.overdue.text : isRefundEntry ? Palette.primary : Palette.status.paid.text}
                          />
                        </View>
                        <View style={styles.historyTextCol}>
                          <Text style={styles.residentName}>{entry.title}</Text>
                          <Text style={styles.roomSubtitle}>
                            {entry.date} · {entry.mode}
                          </Text>
                          {entry.note ? <Text style={styles.historyNoteText}>{entry.note}</Text> : null}
                        </View>
                        <Text
                          style={[
                            styles.depositAmount,
                            isDeduction ? { color: Palette.status.overdue.text } : undefined,
                          ]}
                        >
                          {entry.amount}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>

        {actionModal}
      </View>
    );
  }

  // --- MAIN SCREEN: DEPOSITS ROOM LIST ---
  return (
    <View style={styles.outerScreen}>
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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButtonCircle}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Back to Home"
              >
                <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Deposits</Text>
            </View>
          </View>

          {/* Summary Metrics Row */}
          <View style={styles.metricsRow}>
            {/* Total Held Card */}
            <View style={styles.metricCard}>
              <Image
                source={DEPOSITS_CARD_BG}
                resizeMode="cover"
                style={styles.metricCardBgImage}
              />
              <View style={styles.metricCardContent}>
                <Text style={styles.metricLabel}>Total Held</Text>
                <Text style={styles.metricValue}>{formatRupeeAmount(totalHeldAmount)}</Text>
                <Text style={styles.metricSub}>
                  {heldRooms.length} room {heldRooms.length === 1 ? 'deposit' : 'deposits'}
                </Text>
                <View style={styles.metricIndicator} />
              </View>
            </View>

            {/* Total Refunded Card */}
            <View style={styles.metricCard}>
              <Image
                source={DEPOSITS_CARD_BG}
                resizeMode="cover"
                style={styles.metricCardBgImage}
              />
              <View style={styles.metricCardContent}>
                <Text style={styles.metricLabel}>Total Refunded</Text>
                <Text style={[styles.metricValue, { color: Palette.text }]}>
                  {formatRupeeAmount(totalRefundedAmount)}
                </Text>
                <Text style={styles.metricSub}>
                  {refundedRooms.length}{' '}
                  {refundedRooms.length === 1 ? 'room refunded' : 'rooms refunded'}
                </Text>
                <View style={[styles.metricIndicator, { backgroundColor: Palette.primary }]} />
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarBox}>
            <Feather name="search" size={Typography.iconSize.sm} color={Palette.primary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search room, resident, or floor..."
              placeholderTextColor={Palette.textMuted}
              accessibilityLabel="Search rooms in deposits"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x" size={Typography.iconSize.sm} color={Palette.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['All', 'Held', 'Refunded'] as const).map((tab) => {
              const isActive = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Room List: Separate Bar / Card for each room */}
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptySearchText}>No rooms match your filter.</Text>
            </View>
          ) : (
            filteredRooms.map((item) => {
              const statusColor = getDepositStatusColor(item.status);
              const subtitle =
                item.status === 'No Deposit'
                  ? `Vacant · ${item.room.type} · ${item.room.wing}`
                  : `${item.residentName} · ${item.room.wing}`;

              return (
                <TouchableOpacity
                  key={item.room.id}
                  style={styles.depositCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setNoticeText(null);
                    setSelectedRoomNumber(item.room.roomNumber);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open deposit details for ${item.room.roomNumber}`}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.residentName}>{item.room.roomNumber}</Text>
                    <Text style={styles.roomSubtitle}>{subtitle}</Text>
                  </View>

                  <View style={styles.rowRightAction}>
                    <View style={styles.rowRight}>
                      <Text style={styles.depositAmount}>{item.amount}</Text>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {item.status}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingTop: 12,
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
    marginBottom: 18,
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
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    position: 'relative',
  },
  metricCardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  metricCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.accentText,
    marginBottom: 2,
    lineHeight: 22,
  },
  metricSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    lineHeight: 12,
  },
  metricIndicator: {
    height: 2.5,
    backgroundColor: Palette.primary,
    borderRadius: 2,
    marginTop: 6,
    width: '35%',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  depositCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  rowLeft: {
    flex: 1,
  },
  residentName: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  roomSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  rowRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  depositAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  emptySearchBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
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
    color: Palette.primary,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 20,
  },
  roomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 10,
  },
  roomBannerInfo: {
    flex: 1,
    marginRight: 8,
  },
  roomBannerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  roomBannerSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
  },
  statusTextPlain: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  detailLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '700',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.primary,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 12,
  },
  primaryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyTextCol: {
    flex: 1,
    marginRight: 10,
  },
  historyNoteText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  sheetModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  sheetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetModalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    paddingVertical: 0,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
  },
  selectValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '500',
    color: Palette.text,
  },
  modeDropdown: {
    marginTop: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  modeOptionBorder: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  modeOptionActive: {
    backgroundColor: Palette.tint,
  },
  modeOptionText: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '500',
  },
  modeOptionTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorBannerText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.status.overdue.text,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    marginTop: 18,
    height: 46,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  previewHintText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 6,
  },
});
