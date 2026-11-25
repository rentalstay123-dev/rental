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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type {
  PaymentMode,
  PaymentRecord,
  PaymentStatus,
  RentFilter,
  ResolvedRoomRent,
  RoomRentStatus,
} from '../../types/appData';
import { formatShortDate } from '../../utils/finance';

export type { RentFilter };

interface RentViewProps {
  onBack?: () => void;
  initialFilter?: RentFilter;
}

type RoomStatus = RoomRentStatus;
type RoomRentDetail = ResolvedRoomRent;

interface RecordedReceipt {
  roomNumber: string;
  totalPaid: string;
  rentApplied: string;
  rentAppliedNum: number;
  advanceAdded?: string;
  updatedAdvance?: string;
  nextMonthLabel?: string;
  paymentDate: string;
  mode: PaymentMode;
}

let nextPaymentRecordSeq = 100;
const getNextPaymentId = () => `h-${Date.now()}-${++nextPaymentRecordSeq}`;

const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Bank Transfer', 'Cash', 'Net Banking'];

function getStatusColors(status: RoomStatus | PaymentStatus) {
  if (status === 'Paid') return Palette.status.paid;
  if (status === 'Overdue') return Palette.status.overdue;
  return Palette.status.due;
}

function getStatusDisplay(room: RoomRentDetail) {
  if (room.currentStatus === 'Paid') {
    return {
      text: 'Paid',
      color: '#06402B',
    };
  }
  if (room.currentStatus === 'Overdue') {
    return {
      text: 'Overdue',
      color: '#c41e3a',
    };
  }
  if (room.dueDate) {
    const m = room.dueDate.trim().match(/^(\d+)\s+([A-Za-z]{3})/);
    if (m) {
      return {
        text: `Due ${m[2]} ${m[1]}`,
        color: '#A0522D',
      };
    }
  }
  return {
    text: 'Due',
    color: '#A0522D',
  };
}

function formatAmountDisplay(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '₹0';
  return `₹${Number(digits).toLocaleString('en-IN')}`;
}

const CALENDAR_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const CALENDAR_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, monthIndex: number): number {
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
}

function getFirstWeekday(year: number, monthIndex: number): number {
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adjustedYear = monthIndex < 2 ? year - 1 : year;
  return (
    (adjustedYear +
      Math.floor(adjustedYear / 4) -
      Math.floor(adjustedYear / 100) +
      Math.floor(adjustedYear / 400) +
      offsets[monthIndex] +
      1) %
    7
  );
}

function formatCalendarDate(year: number, monthIndex: number, day: number): string {
  return `${String(day).padStart(2, '0')} ${CALENDAR_MONTHS_SHORT[monthIndex]} ${year}`;
}

function buildCalendarWeeks(year: number, monthIndex: number): (number | null)[][] {
  const firstWeekday = getFirstWeekday(year, monthIndex);
  const totalDays = getDaysInMonth(year, monthIndex);
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d += 1) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function getNextDueDateInfo(currentDueDate: string): {
  nextDueDate: string;
  nextMonthLabel: string;
} {
  const match = currentDueDate.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) {
    return { nextDueDate: currentDueDate, nextMonthLabel: 'Next Month' };
  }
  const dayPart = match[1];
  const monthIdx = CALENDAR_MONTHS_SHORT.findIndex(
    (m) => m.toLowerCase() === match[2].toLowerCase()
  );
  const yearNum = parseInt(match[3], 10);
  if (monthIdx === -1 || Number.isNaN(yearNum)) {
    return { nextDueDate: currentDueDate, nextMonthLabel: 'Next Month' };
  }
  const nextMonthIdx = (monthIdx + 1) % 12;
  const nextYear = monthIdx === 11 ? yearNum + 1 : yearNum;
  const nextMonthShort = CALENDAR_MONTHS_SHORT[nextMonthIdx];
  return {
    nextDueDate: `${dayPart} ${nextMonthShort} ${nextYear}`,
    nextMonthLabel: `${nextMonthShort} ${nextYear}`,
  };
}

interface RoomMetaListProps {
  room: RoomRentDetail;
  includeTenant?: boolean;
  showDividers?: boolean;
}

/** Shared key-value summary rows used across both the expanded Rent card and Details view. */
function RoomMetaList({ room, includeTenant = false, showDividers = false }: RoomMetaListProps) {
  const statusPalette = getStatusColors(room.currentStatus);
  const rows: {
    key: string;
    label: string;
    value: string;
    valueColor?: string;
  }[] = [
      ...(includeTenant
        ? [
          {
            key: 'tenant',
            label: 'Tenant',
            value: room.tenantName,
          },
        ]
        : []),
      {
        key: 'amount',
        label: 'Rent Amount',
        value: room.monthlyRent,
      },
      {
        key: 'maintenance',
        label: 'Maintenance',
        value: room.maintenanceAmount,
      },
      {
        key: 'advance',
        label: 'Advance Payment',
        value: room.advancePayment,
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        value: room.dueDate,
      },
      {
        key: 'cycle',
        label: 'Payment Cycle',
        value: room.paymentCycle,
      },
      {
        key: 'status',
        label: 'Status',
        value: room.currentStatus,
        valueColor: statusPalette.text,
      },
    ];

  return (
    <View style={showDividers ? undefined : styles.expandedDetails}>
      {rows.map((row, index) => (
        <React.Fragment key={row.key}>
          <View style={showDividers ? styles.detailRow : styles.expandedMetaRow}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={[styles.detailValue, row.valueColor ? { color: row.valueColor } : undefined]}>
              {row.value}
            </Text>
          </View>
          {showDividers && index < rows.length - 1 && <View style={styles.rowDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function RentView({
  onBack,
  initialFilter = 'All',
}: RentViewProps) {
  const {
    rentList: rooms,
    recordRentPayment,
    refreshWorkspace,
  } = useAppData();

  const now = new Date();
  const todayFormatted = formatShortDate(now);

  const [filter, setFilter] = useState<RentFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'list' | 'details' | 'record'>('list');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Record Payment form state
  const [amountInput, setAmountInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(todayFormatted);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [showModePicker, setShowModePicker] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [recordedReceipt, setRecordedReceipt] = useState<RecordedReceipt | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  const totalRoomsCount = rooms.length;
  const paidRoomsCount = rooms.filter((r) => r.currentStatus === 'Paid').length;
  const dueRoomsCount = rooms.filter(
    (r) => r.currentStatus === 'Due' || r.currentStatus === 'Overdue'
  ).length;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredList = rooms.filter((item) => {
    const matchesFilter =
      filter === 'All'
        ? true
        : filter === 'Paid'
          ? item.currentStatus === 'Paid'
          : item.currentStatus === 'Due' || item.currentStatus === 'Overdue';
    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;
    return (
      item.roomNumber.toLowerCase().includes(normalizedQuery) ||
      item.tenantName.toLowerCase().includes(normalizedQuery) ||
      item.wing.toLowerCase().includes(normalizedQuery) ||
      item.currentStatus.toLowerCase().includes(normalizedQuery)
    );
  });

  const handleOpenDetails = (room: RoomRentDetail) => {
    setSelectedRoomId(room.id);
    setShowAllHistory(false);
    setActiveScreen('details');
  };

  const handleOpenRecordPayment = (room: RoomRentDetail) => {
    const currentNow = new Date();
    setSelectedRoomId(room.id);
    setAmountInput(room.monthlyRent.replace(/^₹\s*/, ''));
    setPaymentDateInput(formatShortDate(currentNow));
    setCalendarYear(currentNow.getFullYear());
    setCalendarMonth(currentNow.getMonth());
    setShowDatePicker(false);
    setPaymentMode('UPI');
    setShowModePicker(false);
    setShowRoomPicker(false);
    setReferenceInput('');
    setPaymentError(null);
    setActiveScreen('record');
  };

  const handleOpenCollectScreen = () => {
    const targetRoom =
      rooms.find((r) => r.id === selectedRoomId) ||
      rooms.find((r) => r.currentStatus === 'Overdue' || r.currentStatus === 'Due') ||
      rooms[0];
    if (targetRoom) {
      handleOpenRecordPayment(targetRoom);
    }
  };

  const handlePrevCalendarMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextCalendarMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSubmitPayment = () => {
    if (!selectedRoom) return;
    const paidNum = parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
    if (paidNum <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    const formattedPaid = formatAmountDisplay(amountInput);
    const cleanDate = paymentDateInput.trim() || formatShortDate();
    const refNote = referenceInput.trim();

    const isAlreadyPaidThisMonth = selectedRoom.currentStatus === 'Paid';
    const fullRentNum = selectedRoom.numericFullRent;
    const rentAppliedNum = isAlreadyPaidThisMonth ? 0 : Math.min(paidNum, fullRentNum);
    const excessAdvanceNum = isAlreadyPaidThisMonth
      ? paidNum
      : Math.max(0, paidNum - fullRentNum);

    const formattedRentApplied = `₹${rentAppliedNum.toLocaleString('en-IN')}`;
    const existingAdvanceNum =
      parseInt(selectedRoom.advancePayment.replace(/[^0-9]/g, ''), 10) || 0;
    const updatedAdvanceNum = existingAdvanceNum + excessAdvanceNum;
    const updatedAdvanceFormatted = `₹${updatedAdvanceNum.toLocaleString('en-IN')}`;

    const nextDueInfo = getNextDueDateInfo(selectedRoom.dueDate);
    const shouldAdvanceMonth =
      (isAlreadyPaidThisMonth && paidNum >= fullRentNum) || excessAdvanceNum >= fullRentNum;
    const updatedDueDate = shouldAdvanceMonth ? nextDueInfo.nextDueDate : selectedRoom.dueDate;

    const newRecords: PaymentRecord[] = [];
    if (excessAdvanceNum > 0) {
      const advanceBaseTitle = `Advance Payment (${nextDueInfo.nextMonthLabel})`;
      newRecords.push({
        id: getNextPaymentId(),
        title: refNote && isAlreadyPaidThisMonth ? `${advanceBaseTitle} · ${refNote}` : advanceBaseTitle,
        amount: `₹${excessAdvanceNum.toLocaleString('en-IN')}`,
        date: cleanDate,
        status: 'Paid',
        method: paymentMode,
      });
    }

    if (rentAppliedNum > 0) {
      const rentBaseTitle =
        paidNum < fullRentNum ? 'Partial Rent Payment' : 'Rent Payment';
      newRecords.push({
        id: getNextPaymentId(),
        title: refNote ? `${rentBaseTitle} · ${refNote}` : rentBaseTitle,
        amount: formattedRentApplied,
        date: cleanDate,
        status: 'Paid',
        method: paymentMode,
      });
    }

    const isThisMonthSettled = isAlreadyPaidThisMonth || paidNum >= fullRentNum;
    void recordRentPayment({
      room: selectedRoom,
      paidNum,
      rentAppliedNum,
      excessAdvanceNum,
      updatedAdvanceFormatted,
      updatedDueDate,
      isThisMonthSettled,
      newRecords,
      paymentDate: cleanDate,
      mode: paymentMode,
    });

    setPaymentError(null);
    setRecordedReceipt({
      roomNumber: selectedRoom.roomNumber,
      totalPaid: formattedPaid,
      rentApplied: formattedRentApplied,
      rentAppliedNum,
      advanceAdded:
        excessAdvanceNum > 0 ? `₹${excessAdvanceNum.toLocaleString('en-IN')}` : undefined,
      updatedAdvance: excessAdvanceNum > 0 ? updatedAdvanceFormatted : undefined,
      nextMonthLabel: excessAdvanceNum > 0 ? nextDueInfo.nextMonthLabel : undefined,
      paymentDate: cleanDate,
      mode: paymentMode,
    });
  };

  const handleCloseReceipt = () => {
    setRecordedReceipt(null);
    setActiveScreen('list');
  };

  // --- SUB-SCREEN: ROOM DETAILS ---
  if (activeScreen === 'details' && selectedRoom) {
    const statusPalette = getStatusColors(selectedRoom.currentStatus);
    const visibleHistory = showAllHistory ? selectedRoom.history : selectedRoom.history.slice(0, 3);

    return (
      <View style={styles.outerScreen}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.contentWrapper}>
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButtonCircle}
                onPress={() => setActiveScreen('list')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Back to Rent list"
              >
                <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{selectedRoom.roomNumber}</Text>
            </View>

            {/* Details Summary Card */}
            <View style={styles.detailsCard}>
              <View style={styles.roomBanner}>
                <View style={styles.roomBannerInfo}>
                  <Text style={styles.roomBannerTitle}>{selectedRoom.roomNumber}</Text>
                  <Text style={styles.roomBannerSub}>
                    {selectedRoom.tenantName} · {selectedRoom.wing}
                  </Text>
                </View>
                <Text style={[styles.statusPillText, { color: statusPalette.text }]}>
                  {selectedRoom.currentStatus}
                </Text>
              </View>

              <RoomMetaList room={selectedRoom} includeTenant showDividers />
            </View>

            <View style={styles.detailsActionRow}>
              <TouchableOpacity
                style={styles.recordBtn}
                activeOpacity={0.85}
                onPress={() => handleOpenRecordPayment(selectedRoom)}
                accessibilityRole="button"
                accessibilityLabel={`Record payment for ${selectedRoom.roomNumber}`}
              >
                <Text style={styles.recordBtnText}>Record Payment</Text>
              </TouchableOpacity>
            </View>

            {/* Payment History Section */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historySectionTitle}>Payment History</Text>
              {selectedRoom.history.length > 3 && (
                <TouchableOpacity
                  onPress={() => setShowAllHistory((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewAllLink}>{showAllHistory ? 'Show Less' : 'View All'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.historyListCard}>
              {visibleHistory.length === 0 ? (
                <View style={styles.emptySearchBox}>
                  <Text style={styles.emptySearchText}>No payment records yet.</Text>
                </View>
              ) : (
                visibleHistory.map((record, index) => {
                  const isLast = index === visibleHistory.length - 1;
                  const isPaid = record.status === 'Paid';
                  const isAdvanceRecord = record.title.toLowerCase().includes('advance');
                  const isCompleted = isPaid || isAdvanceRecord;
                  return (
                    <View key={record.id}>
                      <View style={styles.historyItemRow}>
                        <View
                          style={[
                            styles.historyStatusIcon,
                            {
                              backgroundColor: isCompleted
                                ? Palette.iconBg
                                : getStatusColors(record.status).bg,
                            },
                          ]}
                        >
                          <Feather
                            name={isCompleted ? 'check' : 'clock'}
                            size={Typography.iconSize.sm}
                            color={
                              isCompleted
                                ? Palette.status.paid.text
                                : getStatusColors(record.status).text
                            }
                          />
                        </View>
                        <View style={styles.historyTextCol}>
                          <Text style={styles.historyItemStatus}>{record.title}</Text>
                          <Text style={styles.historyItemDate}>
                            {record.date}
                            {record.method ? ` · ${record.method}` : ''}
                          </Text>
                        </View>
                        <Text style={styles.historyItemAmount}>{record.amount}</Text>
                      </View>
                      {!isLast && <View style={styles.rowDivider} />}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- SUB-SCREEN: RECORD PAYMENT + CONFIRMATION RECEIPT MODAL ---
  if (activeScreen === 'record' && selectedRoom) {
    const payLabelAmount = formatAmountDisplay(amountInput);
    const calendarWeeks = buildCalendarWeeks(calendarYear, calendarMonth);

    return (
      <View style={styles.outerScreen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.scrollView}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.container}
          >
            <View style={styles.contentWrapper}>
              {/* Header */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButtonCircle}
                  onPress={() => setActiveScreen('list')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Rent list"
                >
                  <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Record Payment</Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {/* Room Selector with Dropdown */}
                <TouchableOpacity
                  style={[styles.roomBannerForm, showRoomPicker && styles.roomBannerFormActive]}
                  activeOpacity={0.75}
                  onPress={() => {
                    setShowRoomPicker((prev) => !prev);
                    setShowDatePicker(false);
                    setShowModePicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Room selector, currently ${selectedRoom.roomNumber}`}
                  accessibilityState={{ expanded: showRoomPicker }}
                >
                  <View style={styles.roomBannerInfo}>
                    <View style={styles.roomTitleWithDropdownRow}>
                      <Text style={styles.roomBannerTitle}>{selectedRoom.roomNumber}</Text>
                      <Feather
                        name={showRoomPicker ? 'chevron-up' : 'chevron-down'}
                        size={15}
                        color={Palette.primary}
                      />
                    </View>
                    <Text style={styles.roomBannerSub}>
                      {selectedRoom.tenantName} · {selectedRoom.wing}
                    </Text>
                  </View>
                  <Text style={styles.advancePlainText}>
                    Advance: {selectedRoom.advancePayment}
                  </Text>
                </TouchableOpacity>

                {/* Room Picker Dropdown List */}
                {showRoomPicker && (
                  <View style={styles.roomDropdownCard}>
                    <ScrollView
                      style={styles.roomDropdownScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {rooms.map((room, idx) => {
                        const isSelected = room.id === selectedRoom.id;
                        const roomStatus = getStatusDisplay(room);
                        return (
                          <TouchableOpacity
                            key={room.id}
                            style={[
                              styles.roomDropdownRow,
                              idx > 0 && styles.modeOptionBorder,
                              isSelected && styles.roomDropdownRowSelected,
                            ]}
                            activeOpacity={0.75}
                            onPress={() => {
                              setSelectedRoomId(room.id);
                              setAmountInput(room.monthlyRent.replace(/^₹\s*/, ''));
                              setShowRoomPicker(false);
                              if (paymentError) setPaymentError(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${room.roomNumber}, ${room.tenantName}`}
                          >
                            <View style={styles.roomDropdownLeft}>
                              <Text
                                style={[
                                  styles.roomDropdownNumber,
                                  isSelected && styles.roomDropdownNumberSelected,
                                ]}
                              >
                                {room.roomNumber}
                              </Text>
                              <Text style={styles.roomDropdownSub}>
                                {room.tenantName} · {room.wing}
                              </Text>
                            </View>
                            <View style={styles.roomDropdownRight}>
                              <Text style={styles.roomDropdownRent}>{room.monthlyRent}</Text>
                              <Text
                                style={[
                                  styles.roomDropdownStatus,
                                  { color: roomStatus.color },
                                ]}
                              >
                                {roomStatus.text}
                              </Text>
                            </View>
                            {isSelected ? (
                              <Feather
                                name="check"
                                size={Typography.iconSize.sm}
                                color={Palette.primary}
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Amount Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Amount <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.textInput}
                      value={amountInput}
                      onChangeText={(txt) => {
                        setAmountInput(txt);
                        if (paymentError) setPaymentError(null);
                      }}
                      keyboardType="numeric"
                      placeholder={selectedRoom.monthlyRent.replace(/^₹\s*/, '')}
                      placeholderTextColor={Palette.textMuted}
                      accessibilityLabel="Payment amount"
                    />
                  </View>
                </View>

                {/* Payment Date Dropdown Calendar */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Payment Date <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    activeOpacity={0.75}
                    onPress={() => {
                      setShowModePicker(false);
                      setShowDatePicker((prev) => !prev);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Payment date ${paymentDateInput}`}
                  >
                    <View style={styles.selectLeftCol}>
                      <Feather
                        name="calendar"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                        style={styles.inputLeftIcon}
                      />
                      <Text style={styles.selectValue}>{paymentDateInput}</Text>
                    </View>
                    <Feather
                      name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <View style={styles.calendarDropdown}>
                      <View style={styles.calendarHeaderRow}>
                        <TouchableOpacity
                          style={styles.calendarNavBtn}
                          onPress={handlePrevCalendarMonth}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Previous month"
                        >
                          <Feather name="chevron-left" size={Typography.iconSize.sm} color={Palette.primary} />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthTitle}>
                          {CALENDAR_MONTHS_FULL[calendarMonth]} {calendarYear}
                        </Text>
                        <TouchableOpacity
                          style={styles.calendarNavBtn}
                          onPress={handleNextCalendarMonth}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Next month"
                        >
                          <Feather name="chevron-right" size={Typography.iconSize.sm} color={Palette.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarWeekRow}>
                        {CALENDAR_WEEKDAYS.map((dayLabel) => (
                          <Text key={dayLabel} style={styles.calendarWeekDayText}>
                            {dayLabel}
                          </Text>
                        ))}
                      </View>

                      {calendarWeeks.map((week, wIdx) => (
                        <View key={`week-${wIdx}`} style={styles.calendarGridRow}>
                          {week.map((day, dIdx) => {
                            if (day === null) {
                              return <View key={`empty-${wIdx}-${dIdx}`} style={styles.calendarDayCell} />;
                            }
                            const dateStr = formatCalendarDate(calendarYear, calendarMonth, day);
                            const isSelected = dateStr === paymentDateInput;

                            return (
                              <TouchableOpacity
                                key={dateStr}
                                style={[
                                  styles.calendarDayCell,
                                  isSelected && styles.calendarDayCellSelected,
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                  setPaymentDateInput(dateStr);
                                  setShowDatePicker(false);
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                              >
                                <Text
                                  style={[
                                    styles.calendarDayText,
                                    isSelected && styles.calendarDayTextSelected,
                                  ]}
                                >
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Payment Mode Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Payment Mode <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    activeOpacity={0.75}
                    onPress={() => {
                      setShowDatePicker(false);
                      setShowModePicker((prev) => !prev);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Payment mode ${paymentMode}`}
                  >
                    <Text style={styles.selectValue}>{paymentMode}</Text>
                    <Feather
                      name={showModePicker ? 'chevron-up' : 'chevron-down'}
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </TouchableOpacity>

                  {showModePicker && (
                    <View style={styles.modeDropdown}>
                      {PAYMENT_MODES.map((mode, idx) => {
                        const isSelected = mode === paymentMode;
                        return (
                          <TouchableOpacity
                            key={mode}
                            style={[
                              styles.modeOption,
                              idx > 0 && styles.modeOptionBorder,
                              isSelected && styles.modeOptionActive,
                            ]}
                            onPress={() => {
                              setPaymentMode(mode);
                              setShowModePicker(false);
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
                </View>

                {/* Reference Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Reference <Text style={styles.optionalTag}>(Optional)</Text>
                  </Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={referenceInput}
                      onChangeText={setReferenceInput}
                      placeholder="e.g. UPI ID / Transaction No."
                      placeholderTextColor={Palette.textMuted}
                      accessibilityLabel="Payment reference optional"
                    />
                  </View>
                </View>

                {/* Error Banner */}
                {paymentError ? (
                  <View style={styles.paymentErrorBanner}>
                    <Text style={styles.paymentErrorText}>{paymentError}</Text>
                  </View>
                ) : null}

                {/* Primary Pay CTA */}
                <TouchableOpacity
                  style={styles.payButton}
                  activeOpacity={0.88}
                  onPress={handleSubmitPayment}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay ${payLabelAmount}`}
                >
                  <Text style={styles.payButtonText}>{`Pay ${payLabelAmount}`}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Payment Recorded Confirmation Modal */}
        <Modal
          visible={recordedReceipt !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCloseReceipt}
        >
          <View style={styles.receiptOverlay}>
            <TouchableWithoutFeedback onPress={handleCloseReceipt}>
              <View style={styles.modalBackdrop} />
            </TouchableWithoutFeedback>

            {recordedReceipt && (
              <View style={styles.receiptCard}>
                <View style={styles.modalDragHandle} />

                <TouchableOpacity
                  style={styles.receiptCloseBtn}
                  onPress={handleCloseReceipt}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close payment confirmation"
                >
                  <Feather name="x" size={Typography.iconSize.sm} color={Palette.textSecondary} />
                </TouchableOpacity>

                <View style={styles.successHalo}>
                  <View style={styles.successCircle}>
                    <Feather name="check" size={Typography.iconSize.lg} color={Palette.onPrimary} />
                  </View>
                </View>

                <Text style={styles.receiptTitle}>Payment Recorded</Text>
                <Text style={styles.receiptSubtitle}>
                  {recordedReceipt.rentAppliedNum === 0 && recordedReceipt.advanceAdded
                    ? `This month's rent is already paid. ${recordedReceipt.advanceAdded} for ${recordedReceipt.roomNumber} has been added to Advance Payment (${recordedReceipt.nextMonthLabel}).`
                    : recordedReceipt.advanceAdded
                      ? `Payment of ${recordedReceipt.totalPaid} for ${recordedReceipt.roomNumber} recorded. Remaining ${recordedReceipt.advanceAdded} added to Advance Payment (${recordedReceipt.nextMonthLabel}).`
                      : `Payment of ${recordedReceipt.totalPaid} for ${recordedReceipt.roomNumber} has been recorded successfully.`}
                </Text>

                <View style={styles.receiptSummaryBox}>
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Room</Text>
                    <Text style={styles.receiptSummaryValue}>{recordedReceipt.roomNumber}</Text>
                  </View>
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Total Paid</Text>
                    <Text style={styles.receiptSummaryValue}>{recordedReceipt.totalPaid}</Text>
                  </View>
                  {recordedReceipt.rentAppliedNum > 0 ? (
                    <View style={styles.receiptSummaryRow}>
                      <Text style={styles.receiptSummaryLabel}>Rent Applied</Text>
                      <Text style={styles.receiptSummaryValue}>{recordedReceipt.rentApplied}</Text>
                    </View>
                  ) : null}
                  {recordedReceipt.advanceAdded ? (
                    <>
                      <View style={styles.receiptSummaryRow}>
                        <Text style={[styles.receiptSummaryLabel, { color: Palette.primary }]}>
                          Advance ({recordedReceipt.nextMonthLabel})
                        </Text>
                        <Text style={[styles.receiptSummaryValue, { color: Palette.primary }]}>
                          {recordedReceipt.advanceAdded}
                        </Text>
                      </View>
                      <View style={styles.receiptSummaryRow}>
                        <Text style={styles.receiptSummaryLabel}>Total Advance</Text>
                        <Text style={styles.receiptSummaryValue}>
                          {recordedReceipt.updatedAdvance}
                        </Text>
                      </View>
                    </>
                  ) : null}
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Payment Date</Text>
                    <Text style={styles.receiptSummaryValue}>{recordedReceipt.paymentDate}</Text>
                  </View>
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabel}>Mode</Text>
                    <Text style={styles.receiptSummaryValue}>{recordedReceipt.mode}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneButton}
                  activeOpacity={0.88}
                  onPress={handleCloseReceipt}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }

  // --- MAIN SCREEN: RENT ---
  return (
    <View style={styles.outerScreen}>
      <ScrollView
        style={styles.scrollView}
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
          {/* Top Header */}
          <View style={styles.headerRow}>
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
            <Text style={styles.headerTitle}>Rent</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarBox}>
            <Feather name="search" size={Typography.iconSize.sm} color={Palette.primary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
                setExpandedRoomId(null);
              }}
              placeholder="Search room, tenant, or floor..."
              placeholderTextColor={Palette.textMuted}
              accessibilityLabel="Search rooms"
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

          {/* 3 Summary Metric Containers: Total Rooms, Paid, Due */}
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={[
                styles.summaryCard,
                styles.summaryCardTotal,
                filter === 'All' && styles.summaryCardActiveTotal,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setFilter('All');
                setExpandedRoomId(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Total rooms: ${totalRoomsCount}, filter all`}
            >
              <Text style={[styles.summaryValue, styles.summaryValueTotal]}>
                {totalRoomsCount}
              </Text>
              <Text style={styles.summaryLabel}>Total Rooms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                styles.summaryCardPaid,
                filter === 'Paid' && styles.summaryCardActivePaid,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setFilter('Paid');
                setExpandedRoomId(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Paid rooms: ${paidRoomsCount}, filter paid`}
            >
              <Text style={[styles.summaryValue, styles.summaryValuePaid]}>
                {paidRoomsCount}
              </Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                styles.summaryCardDue,
                filter === 'Due' && styles.summaryCardActiveDue,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                setFilter('Due');
                setExpandedRoomId(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Due rooms: ${dueRoomsCount}, filter due`}
            >
              <Text style={[styles.summaryValue, styles.summaryValueDue]}>
                {dueRoomsCount}
              </Text>
              <Text style={styles.summaryLabel}>Due</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills + Collect Button */}
          <View style={styles.toolbarRow}>
            <View style={styles.filterRow}>
              {(['All', 'Paid', 'Due'] as const).map((tab) => {
                const isActive = filter === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => {
                      setFilter(tab);
                      setExpandedRoomId(null);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.collectBtn}
              activeOpacity={0.85}
              onPress={handleOpenCollectScreen}
              accessibilityRole="button"
              accessibilityLabel="Collect rent payment"
            >
              <Text style={styles.collectBtnText}>Collect</Text>
            </TouchableOpacity>
          </View>

          {/* Individual Room Cards List */}
          {filteredList.length === 0 ? (
            <View style={styles.emptySearchBox}>
              <Text style={styles.emptySearchText}>No rooms match your search.</Text>
            </View>
          ) : (
            filteredList.map((room) => {
              const isExpanded = room.id === expandedRoomId;
              const statusInfo = getStatusDisplay(room);

              return (
                <View key={room.id} style={styles.roomCard}>
                  {/* Card Main Row (Always visible) */}
                  <TouchableOpacity
                    style={styles.roomCardMainRow}
                    activeOpacity={0.7}
                    onPress={() => setExpandedRoomId(isExpanded ? null : room.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={`${room.roomNumber}, ${room.tenantName}, ${room.monthlyRent}, ${statusInfo.text}`}
                  >
                    {/* Left purple indicator bar */}
                    <View style={styles.roomAccentBar} />

                    {/* Room title & tenant info */}
                    <View style={styles.roomCardInfo}>
                      <Text style={styles.roomCardTitle}>{room.roomNumber}</Text>
                      <Text style={styles.roomCardSub} numberOfLines={1}>
                        {room.tenantName} · {room.wing}
                      </Text>
                    </View>

                    {/* Vertical Divider */}
                    <View style={styles.roomCardDivider} />

                    {/* Rent Amount & Status */}
                    <View style={styles.roomCardRight}>
                      <Text style={styles.roomCardAmount}>{room.monthlyRent}</Text>
                      <Text style={[styles.roomCardStatusText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Room Details & Actions */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.expandedDivider} />

                      {/* Key-Value Rows */}
                      <RoomMetaList room={room} />

                      {/* Primary Action Row */}
                      <View style={styles.expandedActionsRow}>
                        <TouchableOpacity
                          style={styles.detailsBtn}
                          activeOpacity={0.75}
                          onPress={() => handleOpenDetails(room)}
                          accessibilityRole="button"
                          accessibilityLabel={`View details for ${room.roomNumber}`}
                        >
                          <Text style={styles.detailsBtnText}>View Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.recordBtn}
                          activeOpacity={0.85}
                          onPress={() => handleOpenRecordPayment(room)}
                          accessibilityRole="button"
                          accessibilityLabel={`Record payment for ${room.roomNumber}`}
                        >
                          <Text style={styles.recordBtnText}>Record Payment</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
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
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
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
    alignItems: 'center',
    marginBottom: 18,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTotal: {
    backgroundColor: '#F3ECFB',
    borderColor: '#E3D5F8',
  },
  summaryCardActiveTotal: {
    borderColor: '#4B0082',
    borderWidth: 1.5,
  },
  summaryCardPaid: {
    backgroundColor: '#F3ECFB',
    borderColor: '#E3D5F8',
  },
  summaryCardActivePaid: {
    borderColor: '#4B0082',
    borderWidth: 1.5,
  },
  summaryCardDue: {
    backgroundColor: '#F3ECFB',
    borderColor: '#E3D5F8',
  },
  summaryCardActiveDue: {
    borderColor: '#4B0082',
    borderWidth: 1.5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    textAlign: 'center',
  },
  summaryValueTotal: {
    color: '#4B0082',
  },
  summaryValuePaid: {
    color: '#4B0082',
  },
  summaryValueDue: {
    color: '#4B0082',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.text,
    marginTop: 3,
    textAlign: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  filterPillTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  collectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  collectBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  roomTitleWithDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomBannerFormActive: {
    borderColor: Palette.primary,
  },
  roomDropdownCard: {
    marginTop: -10,
    marginBottom: 16,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  roomDropdownScroll: {
    maxHeight: 220,
  },
  roomDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  roomDropdownRowSelected: {
    backgroundColor: '#F3ECFB',
  },
  roomDropdownLeft: {
    flex: 1,
  },
  roomDropdownNumber: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  roomDropdownNumberSelected: {
    color: Palette.primary,
  },
  roomDropdownSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  roomDropdownRight: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  roomDropdownRent: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  roomDropdownStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  roomCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  roomCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomAccentBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: Palette.primary,
    marginRight: 10,
  },
  roomCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  roomCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    lineHeight: 18,
  },
  roomCardSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  roomCardDivider: {
    width: 1,
    height: 28,
    backgroundColor: Palette.border,
    marginHorizontal: 12,
  },
  roomCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
  },
  roomCardAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
    color: Palette.text,
    lineHeight: 18,
  },
  roomCardStatusText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 10,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginBottom: 8,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Palette.divider,
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
  statusPillText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
  },
  expandedDetails: {
    paddingVertical: 10,
    gap: 10,
  },
  expandedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  recordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 12,
  },
  recordBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 12,
  },
  detailsBtnText: {
    color: Palette.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },

  // --- DETAILS SUB-SCREEN ---
  detailsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 12,
  },
  detailsActionRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  roomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.2,
  },
  viewAllLink: {
    fontSize: Typography.fontSize.viewAll,
    fontWeight: '700',
    color: Palette.primary,
    textDecorationLine: 'underline',
    textDecorationColor: Palette.primary,
  },
  historyListCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  historyStatusIcon: {
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
  },
  historyItemStatus: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  historyItemDate: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  historyItemAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },

  // --- RECORD PAYMENT SUB-SCREEN ---
  formCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
  },
  roomBannerForm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  requiredMark: {
    color: Palette.status.overdue.text,
  },
  optionalTag: {
    fontWeight: '400',
    color: Palette.textSecondary,
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
  inputLeftIcon: {
    marginRight: 10,
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
  payButton: {
    marginTop: 8,
    height: 48,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  advancePlainText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  selectLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarDropdown: {
    marginTop: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarWeekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  calendarGridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDayCell: {
    flex: 1,
    height: 34,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellSelected: {
    backgroundColor: Palette.primary,
  },
  calendarDayText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  calendarDayTextSelected: {
    color: Palette.onPrimary,
    fontWeight: '700',
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
  emptySearchBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  paymentErrorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  paymentErrorText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.status.overdue.text,
    fontWeight: '600',
  },

  // --- PAYMENT RECORDED MODAL ---
  receiptOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  receiptCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.xs,
    backgroundColor: Palette.border,
    marginBottom: 8,
  },
  receiptCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHalo: {
    width: 74,
    height: 74,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.paid.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  successCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.paid.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  receiptSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  receiptSummaryBox: {
    width: '100%',
    backgroundColor: Palette.status.paid.bg,
    borderRadius: 5,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptSummaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  receiptSummaryValue: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '700',
  },
  doneButton: {
    width: '100%',
    height: 46,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
});
