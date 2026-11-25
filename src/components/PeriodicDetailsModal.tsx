import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radius, Typography } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { formatRupeeAmount, MONTHS_SHORT, parseRupeeAmount } from '../utils/finance';

export interface PeriodicDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface PeriodicSpreadsheetRow {
  id: string;
  category: string;
  type: 'Income' | 'Expense';
  dateDisplay: string;
  amount: number;
  amountFormatted: string;
  reason: string;
  createdBy: string;
  timestamp: number;
}

type PeriodPreset = 'This Month' | 'Last Month' | 'Last 30 Days' | 'This Year' | 'All' | null;

const CALENDAR_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const CALENDAR_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CALENDAR_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildCalendarWeeks(year: number, monthIndex: number): (number | null)[][] {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatMMDDYYYY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatDateDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${CALENDAR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PeriodicDetailsModal({ visible, onClose }: PeriodicDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const { transactions, rentList, staff, profile, notifications, refreshWorkspace } = useAppData();
  const unreadCount = notifications ? notifications.filter((n) => !n.isRead).length : 0;

  const now = useMemo(() => new Date(), []);
  const nowMs = useMemo(() => now.getTime(), [now]);

  // Date Filters
  const [activePreset, setActivePreset] = useState<PeriodPreset>('This Month');
  const [fromDate, setFromDate] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const [toDate, setToDate] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

  // Calendar Dropdown State
  const [activeDateField, setActiveDateField] = useState<'from' | 'to'>('from');
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Category filter and search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [visibleCount, setVisibleCount] = useState(25);

  const calendarWeeks = useMemo(() => buildCalendarWeeks(calendarYear, calendarMonth), [calendarYear, calendarMonth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Preset Clicks
  const handleSelectPreset = (preset: 'This Month' | 'Last Month' | 'Last 30 Days' | 'This Year' | 'All') => {
    setActivePreset(preset);
    setIsCalendarOpen(false);
    const today = new Date();

    if (preset === 'This Month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
      setCalendarYear(today.getFullYear());
      setCalendarMonth(today.getMonth());
    } else if (preset === 'Last Month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
      const lastMonthIdx = (today.getMonth() + 11) % 12;
      const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      setCalendarYear(lastMonthYear);
      setCalendarMonth(lastMonthIdx);
    } else if (preset === 'Last 30 Days') {
      const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
      setCalendarYear(today.getFullYear());
      setCalendarMonth(today.getMonth());
    } else if (preset === 'This Year') {
      const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
      setCalendarYear(today.getFullYear());
      setCalendarMonth(today.getMonth());
    } else if (preset === 'All') {
      const start = new Date(2020, 0, 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
      setFromDate(start);
      setToDate(end);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    handleSelectCalendarDay(today.getFullYear(), today.getMonth(), today.getDate());
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

  const handleSelectCalendarDay = (y: number, m: number, d: number) => {
    setActivePreset(null);
    if (activeDateField === 'from') {
      const newFrom = new Date(y, m, d, 0, 0, 0, 0);
      setFromDate(newFrom);
      if (newFrom.getTime() > toDate.getTime()) {
        setToDate(new Date(y, m, d, 23, 59, 59, 999));
      }
      setActiveDateField('to');
    } else {
      const newTo = new Date(y, m, d, 23, 59, 59, 999);
      if (newTo.getTime() < fromDate.getTime()) {
        setFromDate(new Date(y, m, d, 0, 0, 0, 0));
        setToDate(newTo);
      } else {
        setToDate(newTo);
      }
      setIsCalendarOpen(false);
    }
  };

  // Build Comprehensive Rental Spreadsheet Rows
  const allRows = useMemo<PeriodicSpreadsheetRow[]>(() => {
    const rows: PeriodicSpreadsheetRow[] = [];
    const createdByLabel = profile?.fullName ? profile.fullName.trim() : 'Main Admin';

    // 1. Map Transactions
    transactions.forEach((tx) => {
      const isIncome = tx.kind === 'income';
      const parsedDate = new Date(tx.dateIso || tx.createdAt);
      const timestamp = !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : tx.createdAt || nowMs;
      const dateFormatted = formatMMDDYYYY(new Date(timestamp));

      let category = tx.title || (isIncome ? 'Room Rent' : 'Maintenance');
      if (category.toLowerCase().includes('room rent')) category = 'Room Rent';
      else if (category.toLowerCase().includes('deposit')) category = 'Security Deposit';
      else if (category.toLowerCase().includes('staff') || category.toLowerCase().includes('salaries')) category = 'Staff Salaries';
      else if (category.toLowerCase().includes('utilit') || category.toLowerCase().includes('power') || category.toLowerCase().includes('water')) category = 'Utilities';
      else if (category.toLowerCase().includes('repair') || category.toLowerCase().includes('maint')) category = 'Maintenance';

      const dateDetail = tx.subtitle ? `${tx.subtitle} · ${dateFormatted}` : dateFormatted;

      rows.push({
        id: `tx-${tx.id}`,
        category,
        type: isIncome ? 'Income' : 'Expense',
        dateDisplay: dateDetail,
        amount: tx.numericAmount,
        amountFormatted: isIncome ? `+ ₹ ${tx.numericAmount.toLocaleString('en-IN')}` : `- ₹ ${tx.numericAmount.toLocaleString('en-IN')}`,
        reason: tx.subtitle || (isIncome ? 'Rent Payment' : 'Property Expense'),
        createdBy: createdByLabel,
        timestamp,
      });
    });

    // 2. Map Granular Rent Collections from rentList history
    rentList.forEach((room) => {
      if (room.history && room.history.length > 0) {
        room.history.forEach((h, hIdx) => {
          const num = parseRupeeAmount(h.amount);
          if (num > 0) {
            // Check if already represented
            const dateMatch = h.date.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
            let ts = nowMs;
            if (dateMatch) {
              const d = parseInt(dateMatch[1], 10);
              const mIdx = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === dateMatch[2].toLowerCase());
              const y = parseInt(dateMatch[3], 10);
              if (mIdx !== -1) ts = new Date(y, mIdx, d).getTime();
            } else {
              ts = nowMs - (hIdx + 1) * 30 * 24 * 60 * 60 * 1000;
            }

            rows.push({
              id: `rent-${room.id}-${h.id}`,
              category: 'Room Rent',
              type: 'Income',
              dateDisplay: `${room.roomNumber} · ${room.tenantName} · ${formatMMDDYYYY(new Date(ts))}`,
              amount: num,
              amountFormatted: `+ ₹ ${num.toLocaleString('en-IN')}`,
              reason: h.title || `${room.roomNumber} Rent`,
              createdBy: createdByLabel,
              timestamp: ts,
            });
          }
        });
      }
    });

    // 3. Map Staff Salaries if present
    if (staff && staff.length > 0) {
      staff.forEach((s) => {
        if (s.numericSalary > 0) {
          const ts = new Date(now.getFullYear(), now.getMonth(), 13).getTime();
          rows.push({
            id: `staff-${s.id}`,
            category: 'Staff Salaries',
            type: 'Expense',
            dateDisplay: `${s.name} (${s.role}) · ${formatMMDDYYYY(new Date(ts))}`,
            amount: s.numericSalary,
            amountFormatted: `- ₹ ${s.numericSalary.toLocaleString('en-IN')}`,
            reason: `${s.role} Monthly Salary`,
            createdBy: createdByLabel,
            timestamp: ts,
          });
        }
      });
    }

    // Sort descending by timestamp
    rows.sort((a, b) => b.timestamp - a.timestamp);
    return rows;
  }, [transactions, rentList, staff, profile, now, nowMs]);

  // Filter Rows by Date Range, Type, and Search Query
  const filteredRows = useMemo(() => {
    const fromTs = fromDate.getTime();
    const toTs = toDate.getTime();
    const q = searchQuery.trim().toLowerCase();

    return allRows.filter((row) => {
      // Date range check
      if (row.timestamp < fromTs || row.timestamp > toTs) return false;

      // Type check
      if (typeFilter !== 'All' && row.type !== typeFilter) return false;

      // Search query check
      if (q) {
        const matchCat = row.category.toLowerCase().includes(q);
        const matchDate = row.dateDisplay.toLowerCase().includes(q);
        const matchReason = row.reason.toLowerCase().includes(q);
        const matchCreated = row.createdBy.toLowerCase().includes(q);
        const matchAmount = String(row.amount).includes(q);
        if (!matchCat && !matchDate && !matchReason && !matchCreated && !matchAmount) return false;
      }

      return true;
    });
  }, [allRows, fromDate, toDate, typeFilter, searchQuery]);

  // Financial Summary for Filtered Rows
  const totalInflow = useMemo(
    () => filteredRows.filter((r) => r.type === 'Income').reduce((sum, r) => sum + r.amount, 0),
    [filteredRows]
  );
  const totalOutflow = useMemo(
    () => filteredRows.filter((r) => r.type === 'Expense').reduce((sum, r) => sum + r.amount, 0),
    [filteredRows]
  );
  const netBalance = totalInflow - totalOutflow;

  // Pagination for Spreadsheet
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(0, visibleCount);
  }, [filteredRows, visibleCount]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalScreen}>
        <StatusBar style="light" />

        {/* Global Purple Luvora Top Header (Matching Dashboard Reference Image) */}
        <View style={[styles.luvoraTopHeader, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerIconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Feather name="menu" size={Typography.iconSize.header} color={Palette.onPrimary} />
          </TouchableOpacity>

          {/* Luvora Wordmark */}
          <View style={styles.headerBrandContainer}>
            <Text style={styles.headerLogoText}>Luvora</Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerIconButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={onClose}
          >
            <Feather name="bell" size={Typography.iconSize.header} color={Palette.onPrimary} />
            {unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
          </TouchableOpacity>
        </View>

        {/* Page Sub-Header with Back Button, Title, Subtitle, and Share */}
        <View style={styles.subHeaderRow}>
          <View style={styles.subHeaderLeft}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.pageTitle}>Periodic Details</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Palette.primary]}
                tintColor={Palette.primary}
              />
            }
          >
          {/* ========================================================================= */}
          {/* SECTION 1: Date Period Filter with From & To Calendar Range               */}
          {/* ========================================================================= */}
          <View style={styles.filterCard}>
            <View style={styles.dateFieldContainer}>
              {/* FROM and TO Date Selectors */}
              <View style={styles.dateRangeRow}>
                <View style={styles.dateFieldCol}>
                  <Text style={styles.inputFieldLabel}>FROM</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectBox,
                      isCalendarOpen && activeDateField === 'from' && styles.selectBoxActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (isCalendarOpen && activeDateField === 'from') {
                        setIsCalendarOpen(false);
                      } else {
                        setActiveDateField('from');
                        setCalendarYear(fromDate.getFullYear());
                        setCalendarMonth(fromDate.getMonth());
                        setIsCalendarOpen(true);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`From date ${formatDateDisplay(fromDate)}`}
                  >
                    <View style={styles.selectLeftCol}>
                      <Feather
                        name="calendar"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                        style={styles.inputLeftIcon}
                      />
                      <Text style={styles.selectValue} numberOfLines={1}>
                        {formatDateDisplay(fromDate)}
                      </Text>
                    </View>
                    <Feather
                      name={isCalendarOpen && activeDateField === 'from' ? 'chevron-up' : 'chevron-down'}
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.dateFieldCol}>
                  <Text style={styles.inputFieldLabel}>TO</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectBox,
                      isCalendarOpen && activeDateField === 'to' && styles.selectBoxActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (isCalendarOpen && activeDateField === 'to') {
                        setIsCalendarOpen(false);
                      } else {
                        setActiveDateField('to');
                        setCalendarYear(toDate.getFullYear());
                        setCalendarMonth(toDate.getMonth());
                        setIsCalendarOpen(true);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`To date ${formatDateDisplay(toDate)}`}
                  >
                    <View style={styles.selectLeftCol}>
                      <Feather
                        name="calendar"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                        style={styles.inputLeftIcon}
                      />
                      <Text style={styles.selectValue} numberOfLines={1}>
                        {formatDateDisplay(toDate)}
                      </Text>
                    </View>
                    <Feather
                      name={isCalendarOpen && activeDateField === 'to' ? 'chevron-up' : 'chevron-down'}
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calendar Dropdown */}
              {isCalendarOpen && (
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
                    <View>
                      <Text style={styles.calendarMonthTitle}>
                        {CALENDAR_MONTHS_FULL[calendarMonth]} {calendarYear}
                      </Text>
                    </View>
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
                        const cellTime = new Date(calendarYear, calendarMonth, day).getTime();
                        const fromTime = new Date(
                          fromDate.getFullYear(),
                          fromDate.getMonth(),
                          fromDate.getDate()
                        ).getTime();
                        const toTime = new Date(
                          toDate.getFullYear(),
                          toDate.getMonth(),
                          toDate.getDate()
                        ).getTime();

                        const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        const isToday = cellTime === todayTs;

                        const isFrom = cellTime === fromTime;
                        const isTo = cellTime === toTime;
                        const isSelected = isFrom || isTo;

                        return (
                          <TouchableOpacity
                            key={`day-${calendarYear}-${calendarMonth}-${day}`}
                            style={[
                              styles.calendarDayCell,
                              isToday && !isSelected && styles.calendarDayCellToday,
                              isSelected && styles.calendarDayCellSelected,
                            ]}
                            activeOpacity={0.75}
                            onPress={() => handleSelectCalendarDay(calendarYear, calendarMonth, day)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                isToday && !isSelected && styles.calendarDayTextToday,
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

                  {/* Quick 'Today' Selector inside calendar */}
                  <View style={styles.calendarFooterRow}>
                    <TouchableOpacity
                      style={styles.calendarTodayBtn}
                      onPress={handleSelectToday}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Select Today"
                    >
                      <Text style={styles.calendarTodayBtnText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Period Presets Row */}
            <View style={styles.presetsRow}>
              {(['This Month', 'Last Month', 'Last 30 Days', 'This Year', 'All'] as const).map((preset) => {
                const isSelected = activePreset === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ========================================================================= */}
          {/* SECTION 2: Financial Summary Overview Cards                               */}
          {/* ========================================================================= */}
          <View style={styles.summaryOverviewRow}>
            {/* Inflow Card */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewCardLabel} numberOfLines={2}>
                TOTAL INFLOW
              </Text>
              <Text
                style={[styles.overviewCardValue, { color: '#15803D' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatRupeeAmount(totalInflow)}
              </Text>
              <View style={[styles.cardAccentBar, { backgroundColor: '#15803D' }]} />
            </View>

            {/* Outflow Card */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewCardLabel} numberOfLines={2}>
                TOTAL OUTFLOW
              </Text>
              <Text
                style={[styles.overviewCardValue, { color: '#B91C1C' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatRupeeAmount(totalOutflow)}
              </Text>
              <View style={[styles.cardAccentBar, { backgroundColor: '#B91C1C' }]} />
            </View>

            {/* Net Balance Card */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewCardLabel} numberOfLines={2}>
                NET BALANCE
              </Text>
              <Text
                style={[styles.overviewCardValue, { color: Palette.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatRupeeAmount(netBalance)}
              </Text>
              <View style={[styles.cardAccentBar, { backgroundColor: Palette.primary }]} />
            </View>
          </View>

          {/* Search & Type Filter Row */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBox}>
              <Feather name="search" size={14} color={Palette.primary} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search category, resident, amount..."
                placeholderTextColor={Palette.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={14} color={Palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.typeFilterGroup}>
              {(['All', 'Income', 'Expense'] as const).map((t) => {
                const isSelected = typeFilter === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, isSelected && styles.typePillActive]}
                    onPress={() => setTypeFilter(t)}
                  >
                    <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ========================================================================= */}
          {/* SECTION 3: Spreadsheet Preview Table                                      */}
          {/* ========================================================================= */}
          <View style={styles.tableCard}>
            {/* Table Header Bar */}
            <View style={styles.tableTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="grid" size={16} color={Palette.primary} />
                <Text style={styles.tableTopBarTitle}>Spreadsheet Preview</Text>
              </View>
            </View>

            {/* Horizontally Scrollable Data Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
              <View style={styles.tableWrapper}>
                {/* Dark Navy Table Header (Matching Reference Image 1) */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, styles.colIndex]}>#</Text>
                  <Text style={[styles.thCell, styles.colCategory]}>CATEGORY</Text>
                  <Text style={[styles.thCell, styles.colType]}>TYPE</Text>
                  <Text style={[styles.thCell, styles.colDate]}>DATE</Text>
                  <Text style={[styles.thCell, styles.colAmount]}>AMOUNT</Text>
                  <Text style={[styles.thCell, styles.colReason]}>REASON</Text>
                  <Text style={[styles.thCell, styles.colCreated]}>CREATED BY</Text>
                </View>

                {/* Table Rows */}
                {paginatedRows.length === 0 ? (
                  <View style={styles.emptyTableState}>
                    <Feather name="inbox" size={32} color={Palette.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyTableTitle}>No records in this period</Text>
                    <Text style={styles.emptyTableSub}>
                      Try adjusting the date range or clearing filters to see rental transactions.
                    </Text>
                  </View>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <View
                        key={row.id}
                        style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                      >
                        {/* # Index */}
                        <Text style={[styles.tdCell, styles.colIndex, styles.indexText]}>
                          {idx + 1}
                        </Text>

                        {/* Category */}
                        <Text style={[styles.tdCell, styles.colCategory, styles.categoryText]} numberOfLines={1}>
                          {row.category}
                        </Text>

                        {/* Type Badge */}
                        <View style={[styles.tdCell, styles.colType, { justifyContent: 'center' }]}>
                          <View
                            style={[
                              styles.typeBadge,
                              row.type === 'Income' ? styles.typeBadgeIncome : styles.typeBadgeExpense,
                            ]}
                          >
                            <Text
                              style={[
                                styles.typeBadgeText,
                                row.type === 'Income' ? styles.typeBadgeTextIncome : styles.typeBadgeTextExpense,
                              ]}
                            >
                              {row.type}
                            </Text>
                          </View>
                        </View>

                        {/* Date & Details */}
                        <Text style={[styles.tdCell, styles.colDate, styles.dateText]} numberOfLines={1}>
                          {row.dateDisplay}
                        </Text>

                        {/* Amount */}
                        <Text
                          style={[
                            styles.tdCell,
                            styles.colAmount,
                            row.type === 'Income' ? styles.amountIncome : styles.amountExpense,
                          ]}
                          numberOfLines={1}
                        >
                          {row.amountFormatted}
                        </Text>

                        {/* Reason */}
                        <Text style={[styles.tdCell, styles.colReason, styles.reasonText]} numberOfLines={1}>
                          {row.reason}
                        </Text>

                        {/* Created By */}
                        <Text style={[styles.tdCell, styles.colCreated, styles.createdText]} numberOfLines={1}>
                          {row.createdBy}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {/* Table Footer: Load More Button only when more rows exist */}
            {paginatedRows.length < filteredRows.length ? (
              <View style={styles.tableFooterRow}>
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount((prev) => prev + 25)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </Modal>
  );
}

const styles = StyleSheet.create({
  modalScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  luvoraTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: Palette.primary,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.pending.bg,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.onPrimary,
    letterSpacing: 0.5,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backCircleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginRight: 4,
  },
  pageTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  pageSubtitle: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.iconBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  exportBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 36,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },

  /* SECTION 1: Period Filter Bar Styles */
  filterCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  dateFieldContainer: {
    marginBottom: 12,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateFieldCol: {
    flex: 1,
  },
  inputFieldLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 5,
    paddingHorizontal: 12,
    height: 42,
  },
  selectBoxActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.surface,
  },
  selectLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  selectValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  calendarDropdown: {
    marginTop: 8,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    width: 32,
    height: 32,
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
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  calendarDayCellSelected: {
    backgroundColor: Palette.primary,
  },
  calendarDayText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  calendarDayTextToday: {
    color: Palette.primary,
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  calendarFooterRow: {
    marginTop: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
  },
  calendarTodayBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  calendarTodayBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  presetBtnText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.primary,
  },
  presetBtnTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },

  /* SECTION 2: Overview Cards (Clean, Professional & Aligned) */
  summaryOverviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 88,
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  overviewCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minHeight: 26,
    lineHeight: 13,
  },
  overviewCardValue: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: -0.3,
  },
  cardAccentBar: {
    height: 3,
    borderRadius: 2,
    width: '100%',
    marginTop: 8,
  },

  /* Search & Filter Bar */
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    padding: 0,
  },
  typeFilterGroup: {
    flexDirection: 'row',
    backgroundColor: Palette.iconBg,
    borderRadius: 5,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  typePillActive: {
    backgroundColor: Palette.primary,
  },
  typePillText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  typePillTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },

  /* SECTION 3: Spreadsheet Preview Table Styles */
  tableCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Palette.tint,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableTopBarTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  tableWrapper: {
    minWidth: 860,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Palette.primary, // Luvora Deep Indigo
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  thCell: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '800',
    color: Palette.onPrimary,
    letterSpacing: 0.5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  tableRowEven: {
    backgroundColor: Palette.surface,
  },
  tableRowOdd: {
    backgroundColor: Palette.tint, // Luvora Brand Tint
  },
  tdCell: {
    paddingHorizontal: 6,
    fontSize: Typography.fontSize.caption,
  },

  /* Column Widths matching Image 1 layout */
  colIndex: {
    width: 42,
    textAlign: 'center',
  },
  colCategory: {
    width: 140,
  },
  colType: {
    width: 95,
  },
  colDate: {
    width: 240,
  },
  colAmount: {
    width: 115,
    textAlign: 'right',
  },
  colReason: {
    width: 120,
  },
  colCreated: {
    width: 110,
  },

  /* Cell Content Styles */
  indexText: {
    color: Palette.textMuted,
    fontWeight: '600',
  },
  categoryText: {
    fontWeight: '700',
    color: Palette.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  typeBadgeIncome: {
    backgroundColor: Palette.status.paid.bg,
    borderColor: Palette.border,
  },
  typeBadgeExpense: {
    backgroundColor: Palette.status.overdue.bg,
    borderColor: Palette.border,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadgeTextIncome: {
    color: Palette.status.paid.text,
  },
  typeBadgeTextExpense: {
    color: Palette.status.overdue.text,
  },
  dateText: {
    color: Palette.textSecondary,
    fontSize: Typography.fontSize.caption,
  },
  amountIncome: {
    color: Palette.status.paid.text,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  amountExpense: {
    color: Palette.status.overdue.text,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  reasonText: {
    color: Palette.textSecondary,
    fontSize: Typography.fontSize.caption,
  },
  createdText: {
    color: Palette.text,
    fontWeight: '600',
    fontSize: Typography.fontSize.caption,
  },

  /* Footer Load More (Matching Reference Image 1 in Luvora Theme) */
  tableFooterRow: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  loadMoreBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  loadMoreText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  emptyTableState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyTableTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  emptyTableSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
});

